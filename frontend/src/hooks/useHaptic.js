import { useCallback } from 'react';

export function useHaptic() {
  const vibrate = useCallback((pattern = 40) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  const light = useCallback(() => vibrate(10), [vibrate]);
  const medium = useCallback(() => vibrate(40), [vibrate]);
  const heavy = useCallback(() => vibrate([0, 50, 30, 50]), [vibrate]);
  const success = useCallback(() => vibrate([0, 30, 60, 30]), [vibrate]);
  const error = useCallback(() => vibrate([0, 80, 50, 80]), [vibrate]);

  return { vibrate, light, medium, heavy, success, error };
}
