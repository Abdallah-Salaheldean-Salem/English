import { useEffect, useState } from 'react';
import { store, StorageData } from '../lib/store';

export function useStore(): StorageData & {
  setTheme: typeof store.setTheme;
  toggleTheme: typeof store.toggleTheme;
  initializePreset: typeof store.initializePreset;
  updateAppState: typeof store.updateAppState;
  saveSession: typeof store.saveSession;
  deleteSession: typeof store.deleteSession;
  savePiece: typeof store.savePiece;
  deletePiece: typeof store.deletePiece;
  recordError: typeof store.recordError;
  updateError: typeof store.updateError;
  deleteError: typeof store.deleteError;
  addCustomModel: typeof store.addCustomModel;
  deleteCustomModel: typeof store.deleteCustomModel;
  exportBackup: typeof store.exportBackup;
  importBackup: typeof store.importBackup;
  resetAll: typeof store.resetAll;
} {
  const [data, setData] = useState<StorageData>(() => store.getSnapshot());

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setData({ ...store.getSnapshot() });
    });
    return unsubscribe;
  }, []);

  return {
    ...data,
    setTheme: store.setTheme.bind(store),
    toggleTheme: store.toggleTheme.bind(store),
    initializePreset: store.initializePreset.bind(store),
    updateAppState: store.updateAppState.bind(store),
    saveSession: store.saveSession.bind(store),
    deleteSession: store.deleteSession.bind(store),
    savePiece: store.savePiece.bind(store),
    deletePiece: store.deletePiece.bind(store),
    recordError: store.recordError.bind(store),
    updateError: store.updateError.bind(store),
    deleteError: store.deleteError.bind(store),
    addCustomModel: store.addCustomModel.bind(store),
    deleteCustomModel: store.deleteCustomModel.bind(store),
    exportBackup: store.exportBackup.bind(store),
    importBackup: store.importBackup.bind(store),
    resetAll: store.resetAll.bind(store),
  };
}
