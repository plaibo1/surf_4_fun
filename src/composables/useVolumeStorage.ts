const STORAGE_KEY = "voice-volumes";

export function useVolumeStorage() {
  function loadVolumes(): Record<string, number> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error("Failed to parse volume storage", e);
    }
    return {};
  }

  function saveVolume(userName: string, volume: number) {
    const volumes = loadVolumes();
    volumes[userName] = volume;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
  }

  function getVolume(userName: string): number {
    const volumes = loadVolumes();
    return volumes[userName] ?? 100;
  }

  return {
    loadVolumes,
    saveVolume,
    getVolume,
  };
}
