// English Writing Recovery: Windows launcher. Compiled with the C# compiler that ships with Windows (.NET Framework 4.8),
// so building it needs no downloads. See build.cmd.
//
// What it does:
//  - Serves the app page (embedded in this exe) and a small API on http://localhost:<port>/<random token>/ only.
//  - Opens the page in its own Microsoft Edge app window (separate profile, no browser bars).
//  - Data: one JSON file per document in %APPDATA%\EnglishWritingRecovery\data\<collection>\<id>.json, written atomically,
//    with a dated copy of the folder kept each day for 14 days.
//  - Claude: the person's own Anthropic API key, encrypted with Windows DPAPI (current user), sent only to api.anthropic.com.
//  - Exits when the Edge window is closed and the page has stopped pinging, or after 10 idle minutes.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("English Writing Recovery")]
[assembly: AssemblyProduct("English Writing Recovery")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

static class Program
{
    const string Model = "claude-sonnet-5-5";
    const string Api = "https://api.anthropic.com/v1/messages";
    // collection/id, same grammar as the artifact database: no "." or ".." segments, so nothing escapes the data folder.
    static readonly Regex DocPath = new Regex(@"^(?!\.\.?/)[A-Za-z0-9_\-.~:@+]{1,200}/(?!\.\.?$)[A-Za-z0-9_\-.~:@+]{1,200}$");
    static readonly Regex KeyShape = new Regex(@"^sk-ant-[A-Za-z0-9_\-]{20,}$");
    static readonly object WriteLock = new object();

    static string Root, DataDir, KeyFile, Token;
    static byte[] Page;
    static long lastHit = DateTime.UtcNow.Ticks;

    [STAThread]
    static int Main(string[] args)
    {
        bool noWindow = Array.IndexOf(args, "--no-window") >= 0;
        Root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "EnglishWritingRecovery");
        DataDir = Path.Combine(Root, "data");
        KeyFile = Path.Combine(Root, "anthropic-key.bin");
        Directory.CreateDirectory(DataDir);
        string urlFile = Path.Combine(Root, "server-url.txt");

        bool first;
        Mutex mutex = new Mutex(true, "EnglishWritingRecovery.SingleInstance", out first);
        if (!first)
        {
            // Already running: open another window on the same server.
            try { OpenWindow(File.ReadAllText(urlFile).Trim()); } catch (Exception) { }
            return 0;
        }

        try
        {
            using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("app.html"))
            using (MemoryStream m = new MemoryStream()) { s.CopyTo(m); Page = m.ToArray(); }
        }
        catch (Exception e) { Fail("The app page is missing from this exe: " + e.Message); return 1; }

        DailyBackup();
        ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
        byte[] rnd = new byte[16];
        using (RandomNumberGenerator g = RandomNumberGenerator.Create()) g.GetBytes(rnd);
        Token = BitConverter.ToString(rnd).Replace("-", "").ToLowerInvariant();

        HttpListener listener = null;
        int port = 0;
        for (int p = 47811; p < 47900 && listener == null; p++)
        {
            try { HttpListener l = new HttpListener(); l.Prefixes.Add("http://localhost:" + p + "/"); l.Start(); listener = l; port = p; }
            catch (Exception) { listener = null; }
        }
        if (listener == null) { Fail("No free local port between 47811 and 47899."); return 1; }

        string url = "http://localhost:" + port + "/" + Token + "/";
        File.WriteAllText(urlFile, url);
        Thread server = new Thread(delegate () { Serve(listener); });
        server.IsBackground = true;
        server.Start();

        Process edge = noWindow ? null : OpenWindow(url);
        while (true)
        {
            Thread.Sleep(5000);
            double idle = TimeSpan.FromTicks(DateTime.UtcNow.Ticks - Interlocked.Read(ref lastHit)).TotalSeconds;
            bool windowGone = edge == null || edge.HasExited;
            if ((windowGone && idle > 75) || idle > 600) break;
        }
        lock (WriteLock) { listener.Stop(); }
        try { File.Delete(urlFile); } catch (Exception) { }
        GC.KeepAlive(mutex);
        return 0;
    }

    static void Fail(string msg) { MessageBox.Show(msg, "English Writing Recovery", MessageBoxButtons.OK, MessageBoxIcon.Error); }

    static string FindBrowser()
    {
        string[] names = { "msedge.exe", "chrome.exe" };
        foreach (string n in names)
            foreach (RegistryKey hive in new RegistryKey[] { Registry.CurrentUser, Registry.LocalMachine })
            {
                try
                {
                    using (RegistryKey k = hive.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\" + n))
                    {
                        string v = k == null ? null : k.GetValue("") as string;
                        if (!string.IsNullOrEmpty(v) && File.Exists(v)) return v;
                    }
                }
                catch (Exception) { }
            }
        return null;
    }

    static Process OpenWindow(string url)
    {
        string browser = FindBrowser();
        if (browser == null) { Process.Start(url); return null; }
        string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "EnglishWritingRecovery", "window-profile");
        string a = "--app=" + url + " --user-data-dir=\"" + profile + "\" --no-first-run --no-default-browser-check --window-size=1240,880 --disable-background-mode";
        return Process.Start(new ProcessStartInfo(browser, a) { UseShellExecute = false });
    }

    static void DailyBackup()
    {
        try
        {
            if (Directory.GetFiles(DataDir, "*.json", SearchOption.AllDirectories).Length == 0) return;
            string backups = Path.Combine(Root, "backups");
            string today = Path.Combine(backups, DateTime.Now.ToString("yyyy-MM-dd"));
            if (!Directory.Exists(today))
            {
                foreach (string f in Directory.GetFiles(DataDir, "*.json", SearchOption.AllDirectories))
                {
                    string target = Path.Combine(today, f.Substring(DataDir.Length + 1));
                    Directory.CreateDirectory(Path.GetDirectoryName(target));
                    File.Copy(f, target);
                }
            }
            List<string> days = new List<string>(Directory.GetDirectories(backups));
            days.Sort(StringComparer.Ordinal);
            for (int i = 0; i < days.Count - 14; i++) Directory.Delete(days[i], true);
        }
        catch (Exception) { }
    }

    static void Serve(HttpListener l)
    {
        while (l.IsListening)
        {
            HttpListenerContext ctx;
            try { ctx = l.GetContext(); } catch (Exception) { return; }
            ThreadPool.QueueUserWorkItem(delegate (object o) { Handle((HttpListenerContext)o); }, ctx);
        }
    }

    static void Send(HttpListenerContext c, int status, string type, byte[] body)
    {
        try
        {
            c.Response.StatusCode = status;
            c.Response.ContentType = type;
            c.Response.Headers["Cache-Control"] = "no-store";
            c.Response.ContentLength64 = body.Length;
            c.Response.OutputStream.Write(body, 0, body.Length);
            c.Response.OutputStream.Close();
        }
        catch (Exception) { }
    }
    static void Text(HttpListenerContext c, int status, string s) { Send(c, status, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes(s)); }
    static void Json(HttpListenerContext c, int status, string s) { Send(c, status, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(s)); }
    static string Body(HttpListenerContext c, int max)
    {
        using (StreamReader r = new StreamReader(c.Request.InputStream, Encoding.UTF8))
        {
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[8192];
            int n;
            while ((n = r.Read(buf, 0, buf.Length)) > 0)
            {
                sb.Append(buf, 0, n);
                if (sb.Length > max) throw new InvalidDataException("too large");
            }
            return sb.ToString();
        }
    }
    static string FileFor(string docPath)
    {
        string[] parts = docPath.Split('/');
        return Path.Combine(DataDir, parts[0], Uri.EscapeDataString(parts[1]) + ".json");
    }

    static void Handle(HttpListenerContext c)
    {
        Interlocked.Exchange(ref lastHit, DateTime.UtcNow.Ticks);
        try
        {
            string path = c.Request.Url.AbsolutePath;
            string prefix = "/" + Token + "/";
            if (!path.StartsWith(prefix, StringComparison.Ordinal)) { Text(c, 404, "Not found"); return; }
            string host = c.Request.Headers["Host"] ?? "";
            if (!host.StartsWith("localhost:", StringComparison.OrdinalIgnoreCase)) { Text(c, 403, "Forbidden"); return; }
            string rest = path.Substring(prefix.Length);
            bool post = c.Request.HttpMethod == "POST";
            string p = c.Request.QueryString["p"];

            if (rest == "" || rest == "index.html") { Send(c, 200, "text/html; charset=utf-8", Page); return; }
            if (rest == "api/ping") { Text(c, 200, "ok"); return; }
            if (rest == "api/all") { Json(c, 200, ReadAll()); return; }
            if (rest == "api/write" && post)
            {
                if (p == null || !DocPath.IsMatch(p)) { Text(c, 400, "invalid_argument"); return; }
                string body = Body(c, 300000).Trim();
                if (!body.StartsWith("{")) { Text(c, 400, "invalid_argument"); return; }
                string file = FileFor(p);
                lock (WriteLock)
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(file));
                    string tmp = file + ".tmp";
                    File.WriteAllText(tmp, body, new UTF8Encoding(false));
                    if (File.Exists(file)) File.Replace(tmp, file, null); else File.Move(tmp, file);
                }
                Text(c, 200, "ok"); return;
            }
            if (rest == "api/remove" && post)
            {
                if (p == null || !DocPath.IsMatch(p)) { Text(c, 400, "invalid_argument"); return; }
                lock (WriteLock) { string f = FileFor(p); if (File.Exists(f)) File.Delete(f); }
                Text(c, 200, "ok"); return;
            }
            if (rest == "api/key" && !post) { Json(c, 200, "{\"has\":" + (ReadKey() != null ? "true" : "false") + "}"); return; }
            if (rest == "api/key" && post)
            {
                string key = Body(c, 400).Trim();
                if (!KeyShape.IsMatch(key)) { Text(c, 400, "That is not an Anthropic API key."); return; }
                byte[] enc = ProtectedData.Protect(Encoding.UTF8.GetBytes(key), null, DataProtectionScope.CurrentUser);
                File.WriteAllBytes(KeyFile, enc);
                Text(c, 200, "ok"); return;
            }
            if (rest == "api/key/clear" && post) { if (File.Exists(KeyFile)) File.Delete(KeyFile); Text(c, 200, "ok"); return; }
            if (rest == "api/ask" && post) { Ask(c); return; }
            if (rest == "api/save" && post)
            {
                string name = Regex.Replace(c.Request.QueryString["name"] ?? "backup.json", @"[\\/:*?""<>|]", "-");
                string docs = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);
                string target = Path.Combine(docs, name);
                for (int i = 2; File.Exists(target); i++) target = Path.Combine(docs, Path.GetFileNameWithoutExtension(name) + " (" + i + ")" + Path.GetExtension(name));
                File.WriteAllText(target, Body(c, 50000000), new UTF8Encoding(false));
                Text(c, 200, target); return;
            }
            if (rest == "api/open-data" && post) { Process.Start("explorer.exe", "\"" + Root + "\""); Text(c, 200, "ok"); return; }
            Text(c, 404, "Not found");
        }
        catch (Exception e) { Text(c, 500, "error: " + e.Message); }
    }

    static string ReadAll()
    {
        StringBuilder sb = new StringBuilder("{");
        bool firstDoc = true;
        lock (WriteLock)
        {
            foreach (string dir in Directory.GetDirectories(DataDir))
            {
                string coll = Path.GetFileName(dir);
                foreach (string f in Directory.GetFiles(dir, "*.json"))
                {
                    string id = Uri.UnescapeDataString(Path.GetFileNameWithoutExtension(f));
                    string key = coll + "/" + id;
                    if (!DocPath.IsMatch(key)) continue;
                    string body = File.ReadAllText(f, Encoding.UTF8).Trim();
                    if (!body.StartsWith("{")) continue;
                    if (!firstDoc) sb.Append(',');
                    sb.Append(JsonString(key)).Append(':').Append(body);
                    firstDoc = false;
                }
            }
        }
        return sb.Append('}').ToString();
    }

    static string ReadKey()
    {
        try { return Encoding.UTF8.GetString(ProtectedData.Unprotect(File.ReadAllBytes(KeyFile), null, DataProtectionScope.CurrentUser)); }
        catch (Exception) { return null; }
    }

    static string JsonString(string s)
    {
        StringBuilder b = new StringBuilder("\"");
        foreach (char ch in s)
        {
            if (ch == '"') b.Append("\\\"");
            else if (ch == '\\') b.Append("\\\\");
            else if (ch < 0x20) b.Append("\\u").Append(((int)ch).ToString("x4"));
            else b.Append(ch);
        }
        return b.Append('"').ToString();
    }

    // Passes Claude's reply (or error) straight back; the page reads the JSON.
    static void Ask(HttpListenerContext c)
    {
        string key = ReadKey();
        if (key == null) { Text(c, 412, "not_granted"); return; }
        string prompt = Body(c, 250000);
        string req = "{\"model\":" + JsonString(Model) + ",\"max_tokens\":4000,\"messages\":[{\"role\":\"user\",\"content\":" + JsonString(prompt) + "}]}";
        HttpWebRequest w = (HttpWebRequest)WebRequest.Create(Api);
        w.Method = "POST";
        w.ContentType = "application/json";
        w.Headers["x-api-key"] = key;
        w.Headers["anthropic-version"] = "2023-06-01";
        w.Timeout = 300000;
        w.ReadWriteTimeout = 300000;
        byte[] data = Encoding.UTF8.GetBytes(req);
        try
        {
            using (Stream s = w.GetRequestStream()) s.Write(data, 0, data.Length);
            using (HttpWebResponse r = (HttpWebResponse)w.GetResponse())
            using (StreamReader sr = new StreamReader(r.GetResponseStream(), Encoding.UTF8))
                Json(c, 200, sr.ReadToEnd());
        }
        catch (WebException e)
        {
            HttpWebResponse r = e.Response as HttpWebResponse;
            if (r == null) { Text(c, 502, "upstream_error"); return; }
            using (StreamReader sr = new StreamReader(r.GetResponseStream(), Encoding.UTF8))
                Send(c, (int)r.StatusCode, "application/json; charset=utf-8", Encoding.UTF8.GetBytes(sr.ReadToEnd()));
        }
    }
}
