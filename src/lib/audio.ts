/**
 * Audio utility for emergency alerts and notifications
 */

let audioContext: AudioContext | null = null;
let alarmOscillator: OscillatorNode | null = null;
let alarmGainNode: GainNode | null = null;
let isAlarmPlaying = false;

/**
 * Get or create the AudioContext
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Play a continuous alarm sound for volunteers when new alerts arrive
 * The alarm will loop until stopAlarm() is called
 */
export function playVolunteerAlarm(): void {
  if (isAlarmPlaying) return;
  
  try {
    const ctx = getAudioContext();
    isAlarmPlaying = true;
    
    // Create oscillator and gain node
    alarmOscillator = ctx.createOscillator();
    alarmGainNode = ctx.createGain();
    
    alarmOscillator.connect(alarmGainNode);
    alarmGainNode.connect(ctx.destination);
    
    // Alarm pattern: alternating high-low siren
    alarmOscillator.type = 'sawtooth';
    alarmOscillator.frequency.setValueAtTime(800, ctx.currentTime);
    
    // Create siren effect with frequency modulation
    const scheduleAlarmPattern = () => {
      if (!alarmOscillator || !isAlarmPlaying) return;
      
      const now = ctx.currentTime;
      // High-low siren pattern
      for (let i = 0; i < 10; i++) {
        alarmOscillator.frequency.setValueAtTime(800, now + i * 0.5);
        alarmOscillator.frequency.linearRampToValueAtTime(400, now + i * 0.5 + 0.25);
        alarmOscillator.frequency.linearRampToValueAtTime(800, now + i * 0.5 + 0.5);
      }
      
      // Schedule next pattern
      if (isAlarmPlaying) {
        setTimeout(scheduleAlarmPattern, 5000);
      }
    };
    
    // Set volume with pulsing effect
    alarmGainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    
    // Create pulsing volume
    const pulseVolume = () => {
      if (!alarmGainNode || !isAlarmPlaying) return;
      const now = ctx.currentTime;
      alarmGainNode.gain.setValueAtTime(0.4, now);
      alarmGainNode.gain.linearRampToValueAtTime(0.2, now + 0.25);
      alarmGainNode.gain.linearRampToValueAtTime(0.4, now + 0.5);
      
      if (isAlarmPlaying) {
        setTimeout(pulseVolume, 500);
      }
    };
    
    alarmOscillator.start();
    scheduleAlarmPattern();
    pulseVolume();
    
  } catch (error) {
    console.error('Failed to play alarm:', error);
    isAlarmPlaying = false;
  }
}

/**
 * Stop the volunteer alarm
 */
export function stopVolunteerAlarm(): void {
  isAlarmPlaying = false;
  
  try {
    if (alarmOscillator) {
      alarmOscillator.stop();
      alarmOscillator.disconnect();
      alarmOscillator = null;
    }
    if (alarmGainNode) {
      alarmGainNode.disconnect();
      alarmGainNode = null;
    }
  } catch (error) {
    console.error('Error stopping alarm:', error);
  }
}

/**
 * Check if alarm is currently playing
 */
export function isAlarmActive(): boolean {
  return isAlarmPlaying;
}

/**
 * Play a short notification beep
 */
export function playNotificationBeep(): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (error) {
    console.error('Failed to play notification beep:', error);
  }
}
