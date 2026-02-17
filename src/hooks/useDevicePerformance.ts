import { useState, useEffect } from 'react';

interface DevicePerformance {
  isLowPowerMode: boolean;
  shouldReduceAnimations: boolean;
  shouldReduceEffects: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
}

/**
 * Hook to detect device performance capabilities
 * Checks multiple factors: CPU cores, RAM, connection speed
 */
export function useDevicePerformance(): DevicePerformance {
  const [performance, setPerformance] = useState<DevicePerformance>({
    isLowPowerMode: false,
    shouldReduceAnimations: false,
    shouldReduceEffects: false,
  });

  useEffect(() => {
    const checkDevicePerformance = () => {
      let isLowPower = false;
      let reduceAnimations = false;
      let reduceEffects = false;

      // Check CPU cores (4 or less = budget device)
      const cores = navigator.hardwareConcurrency;
      if (cores && cores <= 4) {
        isLowPower = true;
        reduceAnimations = true;
        reduceEffects = true;
      }

      // Check device memory (less than 4GB = budget device)
      // @ts-ignore - deviceMemory is experimental but widely supported
      const memory = navigator.deviceMemory;
      if (memory && memory < 4) {
        isLowPower = true;
        reduceAnimations = true;
        reduceEffects = true;
      }

      // Check connection speed (slow-2g or 2g = reduce heavy assets)
      // @ts-ignore - connection is experimental
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        const slowConnections = ['slow-2g', '2g'];
        if (slowConnections.includes(connection.effectiveType)) {
          reduceEffects = true;
        }
      }

      // Check if user has enabled reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        reduceAnimations = true;
      }

      setPerformance({
        isLowPowerMode: isLowPower,
        shouldReduceAnimations: reduceAnimations || prefersReducedMotion,
        shouldReduceEffects: reduceEffects || isLowPower,
        deviceMemory: memory,
        hardwareConcurrency: cores,
      });
    };

    checkDevicePerformance();

    // Listen for connection changes
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', checkDevicePerformance);
      return () => connection.removeEventListener('change', checkDevicePerformance);
    }
  }, []);

  return performance;
}
