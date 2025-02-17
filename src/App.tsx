import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Slider, IconButton, Stack, Box, Button, Tooltip, Divider, CardHeader } from '@mui/material';
import { PlayArrow, Pause, TouchApp } from '@mui/icons-material';

// Color palette for rhythms
const RHYTHM_COLORS = [
  'rgb(59, 130, 246)', // Blue
  'rgb(16, 185, 129)', // Green
  'rgb(239, 68, 68)',  // Red
  'rgb(217, 119, 6)',  // Orange
  'rgb(139, 92, 246)'  // Purple
];

const BeatVisualizer = ({ beats, currentBeat, isPlaying, color, bpm }: { beats: number, currentBeat: number, isPlaying: boolean, color: string, bpm: number }) => {
  if (beats === 0) {
    return (
      <Box sx={{
        height: 24,
        width: '100%',
        border: '1px solid rgba(197, 197, 198, 0.4)',
        backgroundColor: 'rgba(229, 231, 235, 0.4)',
        textAlign: 'center',
        color: 'text.disabled',
        fontSize: '0.875rem',
      }}>
        0
      </Box>
    );
  }


  return (
    <Box sx={{
      display: 'grid',
      gap: 1,
      width: '100%',
      gridTemplateColumns: `repeat(${beats}, 1fr)`,
      position: 'relative'
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
    { id: 1, beats: 4, },
    { id: 2, beats: 3, },
    { id: 3, beats: 0, },
    { id: 4, beats: 0, },
    { id: 5, beats: 0, },
  ]);
  const [currentBeats, setCurrentBeats] = useState([0, 0]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<DOMHighResTimeStamp | null>(null);
  const [lastMeasurePos, setLastMeasurePost] = useState<number>(0);

  const tapTimestampsRef = useRef<number[]>([]);
  const tapTimeoutRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const lastMeasurePosRef = useRef<number>(0);

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

  const playSound = (index: number) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.type = 'sine';
    const freq = 220 * (index + 1);
    oscillator.frequency.setValueAtTime(freq, audioContextRef.current.currentTime);

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
      setCurrentBeats(new Array(rhythms.length).fill(-1));
      startTimeRef.current = null;
      lastTickRef.current = null;
      lastMeasurePosRef.current = 0;
      return;
    }
    const previousBeats = currentBeats.length < rhythms.length
      ? [...currentBeats, ...new Array(rhythms.length - currentBeats.length).fill(-1)]
      : currentBeats.slice(0, rhythms.length);
    const tick = (timestamp: DOMHighResTimeStamp) => {
      const delta = lastTickRef.current ? timestamp - lastTickRef.current : 0;
      lastTickRef.current = timestamp;
      const measureLength = (60 / bpm) * 1000 * 4;
      const measurePos = (lastMeasurePosRef.current + delta / measureLength) % 1;

      const newBeats = rhythms.map((rhythm, index) => {
        if (rhythm.beats == 0) return 0;
        const currentBeat = Math.floor(measurePos * rhythm.beats);
        if (currentBeat !== previousBeats[index]
          // happense on single beat rhythms
          || lastMeasurePosRef.current > measurePos) {
          previousBeats[index] = currentBeat;
          playSound(index);
        }
        return currentBeat;
      });

      setCurrentBeats(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(newBeats)) {
          return newBeats;
        }
        return prev;
      });

      lastMeasurePosRef.current = measurePos;
      animationFrameRef.current = requestAnimationFrame(tick);
      setLastMeasurePost(measurePos);
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
      <CardHeader title="Polyrhythm Sandbox">
      </CardHeader>
      <CardContent>
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
            <Button
              size="large"
              color={isPlaying ? "secondary" : "primary"}
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
                { value: 120, },
                { value: 140, },
                { value: 160, },
                { value: 180, },
              ]}
              sx={{ flex: 1, minWidth: "150px" }}
            />
            <Typography sx={{ width: 80, textAlign: 'right' }}>
              ♩ = {bpm}
            </Typography>
            <Tooltip title="Tap to set tempo">
              <IconButton size="small" onClick={handleTap}>
                <TouchApp />
              </IconButton>
            </Tooltip>
          </Stack>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            {/* First column: Sliders */}
            <Stack direction="column" sx={{ flex: 1, justifyContent: 'space-between' }}>
              {rhythms.map((rhythm, index) => (
                <Slider
                  key={rhythm.id}
                  value={rhythm.beats}
                  size="small"
                  min={0}
                  marks
                  max={11}
                  onChange={(_, value) => updateRhythm(rhythm.id, value.toString())}
                  sx={{ color: RHYTHM_COLORS[index],  }}
                  valueLabelDisplay="auto"
                />
              ))}
            </Stack>

            {/* Second column: Visualizers */}
            <Stack spacing={1} sx={{ flex: 4, justifyContent: 'space-between'  }}>
              {rhythms.map((rhythm, index) => (
                <Box key={rhythm.id} sx={{ position: 'relative' }}>
                  {isPlaying && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        height: '100%',
                        width: '4px',
                        backgroundColor: 'rgba(255, 250, 195, 0.8)',
                        boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)',
                        zIndex: 2,
                        transition: 'left linear',
                        transitionDuration: '0ms',
                        left: `${lastMeasurePos * 100}%`
                      }}
                    />
                  )}
                  <BeatVisualizer
                    beats={rhythm.beats}
                    currentBeat={currentBeats[index]}
                    isPlaying={isPlaying}
                    color={RHYTHM_COLORS[index]}
                    bpm={bpm}
                  />
                </Box>
              ))}
            </Stack>
          </Box>
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