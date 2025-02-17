import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, Typography, Slider, IconButton, Stack, Box } from '@mui/material';
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
        border: `1px solid ${color}`,
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

  const addRhythm = () => {
    if (rhythms.length < 5) {
      setRhythms(prev => [
        ...prev,
        { id: Math.max(...prev.map(r => r.id)) + 1, beats: 4 }
      ]);
      setCurrentBeats(prev => [...prev, 0]);
    }
  };

  const removeRhythm = (id: number) => {
    const index = rhythms.findIndex(r => r.id === id);
    setRhythms(prev => prev.filter(rhythm => rhythm.id !== id));
    setCurrentBeats(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto', width: '100%' }}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Polyrhythm Trainer
        </Typography>
        
        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton
              size="small"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
            <Typography sx={{ width: 80 }}>
              ♩ = {bpm}
            </Typography>
            <Slider
              value={bpm}
              onChange={(_, value) => handleBpmChange([value as number])}
              min={30}
              max={200}
              sx={{ flex: 1 }}
            />
            <IconButton size="small" title="Tap tempo">
              <TouchApp />
            </IconButton>
          </Stack>

          <Stack spacing={1}>
            {rhythms.map((rhythm, index) => (
              <Stack key={rhythm.id} direction="row" spacing={2} alignItems="center">
                <Slider
                  value={rhythm.beats}
                  min={0}
                  max={11}
                  onChange={(_, value) => updateRhythm(rhythm.id, value.toString())}
                  sx={{ width: 100 }}
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