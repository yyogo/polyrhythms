import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Slider, IconButton, Stack, Box, Button, Tooltip } from '@mui/material';
import { PlayArrow, Pause, TouchApp } from '@mui/icons-material';

// Color palette for rhythms
const RHYTHM_COLORS = [
  'rgb(59, 130, 246)', // Blue
  'rgb(16, 185, 129)', // Green
  'rgb(239, 68, 68)',  // Red
  'rgb(217, 119, 6)',  // Orange
  'rgb(139, 92, 246)'  // Purple
];

const BeatVisualizer = ({ beats, currentBeat, isPlaying, color }: { beats: number, currentBeat: number, isPlaying: boolean, color: string }) => {
  if (beats === 0) {
    return (
      <Box sx={{
        height: 24,
        width: '100%',
        border: '1px solid rgba(197, 197, 198, 0.4)',
        backgroundColor: 'rgba(229, 231, 235, 0.4)',
        textAlign: 'center',
        color: 'text.secondary',
        fontSize: '0.875rem'
      }}>
        Disabled
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'grid',
      gap: 1,
      width: '100%',
      gridTemplateColumns: `repeat(${beats}, 1fr)`
    }}>
      {Array.from({ length: beats }).map((_, index) => (
        <Box
          key={index}
          sx={{
            height: 24,
            width: '100%',
            border: `1px solid ${color}`,
            backgroundColor: isPlaying && index === currentBeat ? color : 'rgb(229, 231, 235)',
            transition: 'background-color 100ms',
            textAlign: 'center',
            color: isPlaying && index === currentBeat ? 'common.white' : 'text.secondary',
            fontSize: '0.875rem'
          }}
        >
          {index + 1}
        </Box>
      ))}
    </Box>
  );
};

const PolyrhythmTrainer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [rhythms, setRhythms] = useState([
    { id: 1, beats: 4,},
    { id: 2, beats: 3,},
    { id: 3, beats: 0, },
    { id: 4, beats: 0, },
    { id: 5, beats: 0, },
  ]);
  const [currentBeats, setCurrentBeats] = useState([0, 0]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<DOMHighResTimeStamp | null>(null);

  const tapTimestampsRef = useRef<number[]>([]);
  const tapTimeoutRef = useRef<number | null>(null);

  const handleTap = () => {
    const now = performance.now();
    const timestamps = tapTimestampsRef.current;

    // Clear timeout if it exists
    if (tapTimeoutRef.current) {
      window.clearTimeout(tapTimeoutRef.current);
    }

    // Reset timestamps if last tap was more than 2 seconds ago
    if (timestamps.length > 0 && now - timestamps[timestamps.length - 1] > 2000) {
      timestamps.length = 0;
    }

    timestamps.push(now);

    // Keep only the last 4 taps
    if (timestamps.length > 4) {
      timestamps.shift();
    }

    // Calculate BPM if we have at least 2 taps
    if (timestamps.length > 1) {
      const intervals = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      
      const averageInterval = intervals.reduce((a, b) => a + b) / intervals.length;
      const calculatedBpm = Math.round(60000 / averageInterval);
      
      // Clamp BPM between 30 and 200
      setBpm(Math.min(Math.max(calculatedBpm, 30), 200));
    }

    // Clear timestamps after 2 seconds of inactivity
    tapTimeoutRef.current = window.setTimeout(() => {
      tapTimestampsRef.current = [];
    }, 2000);
  };

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: AudioContext }).webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = (frequency: number) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);

    gainNode.gain.setValueAtTime(0.5, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + 0.1
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  };

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setCurrentBeats(new Array(rhythms.length).fill(0));
      startTimeRef.current = null;
      return;
    }

    startTimeRef.current = performance.now();
    const previousBeats = new Array(rhythms.length).fill(-1);

    const tick = (timestamp: number) => {
      const elapsedTime = timestamp - (startTimeRef.current || 0);
      const beatDuration = (60 / bpm) * 1000;

      const newBeats = rhythms.map((rhythm, index) => {
        if (rhythm.beats == 0) return 0;

        const rhythmDuration = beatDuration * (4 / rhythm.beats);
        const totalBeats = elapsedTime / rhythmDuration;
        const currentBeat = Math.floor(totalBeats) % rhythm.beats;

        if (currentBeat !== previousBeats[index]) {
          playSound(220 * (index + 1));
          previousBeats[index] = currentBeat;
        }

        return currentBeat;
      });

      setCurrentBeats(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newBeats)) {
          return newBeats;
        }
        return prev;
      });

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, bpm, rhythms]);

  const handleBpmChange = (value: number[]) => {
    setBpm(value[0]);
  };

  const updateRhythm = (id: number, beats: string) => {
    setRhythms(prev => prev.map(rhythm =>
      rhythm.id === id ? { ...rhythm, beats: parseInt(beats) } : rhythm
    ));
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', width: '100%' }}>
      <CardContent>
        <Typography variant="h2" gutterBottom>
          Polyrhythm Trainer
        </Typography>
        
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              size="large"
              color={ isPlaying? "secondary": "primary" }
              variant="contained"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </Button>
            <Slider
              value={bpm}
              onChange={(_, value) => handleBpmChange([value as number])}
              min={30}
              max={200}
              valueLabelDisplay="auto"
              marks={[
                { value: 60, },
                { value: 80, },
                { value: 100, },
                { value: 120,},
                { value: 140, },
                { value: 160, },
                { value: 180, },
              ]}
              sx={{ flex: 1 }}
            />
            <Typography sx={{ width: 80, textAlign: 'right'}}>
              ♩ = {bpm}
            </Typography>
            <Tooltip title="Tap to set tempo">
              <IconButton size="small" onClick={handleTap}>
                <TouchApp />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack spacing={1}>
            {rhythms.map((rhythm, index) => (
              <Stack key={rhythm.id} direction="row" spacing={2} alignItems="center">
                <Slider
                  value={rhythm.beats}
                  size="small"
                  min={0}
                  marks
                  max={11}
                  onChange={(_, value) => updateRhythm(rhythm.id, value.toString())}
                  sx={{ width: 100, color: RHYTHM_COLORS[index] }}
              valueLabelDisplay="auto"
                />
                <BeatVisualizer
                  beats={rhythm.beats}
                  currentBeat={currentBeats[index]}
                  isPlaying={isPlaying}
                  color={RHYTHM_COLORS[index]}
                />
              </Stack>
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

function App() {
  return (
    <PolyrhythmTrainer />
  )
}

export default App