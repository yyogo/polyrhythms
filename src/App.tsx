import { useState, useEffect, useRef } from 'react';
import {
  Card, CardContent, Typography, Slider, IconButton, Stack, Box, Button,
  Tooltip, Divider, CardHeader, Modal, Link,
  CardActionArea,
  CardActions
} from '@mui/material';
import { PlayArrow, Pause, TouchApp, GitHub, Info, Close } from '@mui/icons-material';
import GitHubIcon from '@mui/icons-material/GitHub';

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

const AboutModal = ({ open, onClose }: { open: boolean, onClose: () => void }) => (
  <Modal open={open} onClose={onClose}>

    <Card sx={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: 800,
      p: 4,
    }}>
      <CardHeader title="About" action={<IconButton size="small" onClick={onClose}><Close /></IconButton>} />
      <CardContent>
        <Typography>
          <p>This app helps you practice or play around with <b>polyrhythms</b> by visualizing and playing multiple rhythms simultaneously.</p>
          <p>A polyrhythm happens when two or more different rhythms are played at the same time. For example, if one hand plays 3 beats while the other plays 2 beats in the same time span, that's a 3:2 polyrhythm. It creates interesting patterns that might sound complex at first, but they occur naturally in many styles of music around the world.</p>
          <h4>Instructions</h4>
          <p>Select the beat count (1-11) for each rhythm using the sliders. Set a slider to 0 to disable that rhythm.</p>
          <p>Adjust tempo using the BPM slider or tap the tempo button repeatedly.</p>
          <p>Press the play button to start the rhythms. The visualizer will show the current beat for each rhythm.</p>
        </Typography>
        <Typography sx={{ display: { xs: 'none', sm: 'block' } }}>
          <h4>Keyboard Shortcuts</h4>
          <ul>
            <li><b>Space</b>: Play/Pause</li>
            <li><b>1-5</b>: Focus rhythm sliders</li>
            <li><b>q/e/w</b>: increase/decrease/tap tempo  (shift for smaller increment)</li>
          </ul>
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" href="https://github.com/yyogo/polyrhythms" target="_blank"><GitHubIcon fontSize="small" />&nbsp;Source Code</Button>
      </CardActions>
    </Card>
  </Modal>
);

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
  const [aboutOpen, setAboutOpen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<DOMHighResTimeStamp | null>(null);
  const [lastMeasurePos, setLastMeasurePost] = useState<number>(0);

  const tapTimestampsRef = useRef<number[]>([]);
  const tapTimeoutRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const lastMeasurePosRef = useRef<number>(0);

  // Add refs for sliders
  const sliderRefs = useRef<(HTMLElement | null)[]>([]);

  // Add keyboard event handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore key events if user is typing in an input
      if ((event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
        && !(event.target.closest('.MuiSlider-root'))) {
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (event.key === 'w' || event.key === 'W') {
        handleTap();
      } else if (event.key === 'q') {
        setBpm(prev => Math.max(prev - 5, 30));
      } else if (event.key === 'Q') {
        setBpm(prev => Math.max(prev - 1, 30));
      } else if (event.key === 'e') {
        setBpm(prev => Math.min(prev + 5, 200));
      } else if (event.key === 'E') {
        setBpm(prev => Math.min(prev + 1, 200));
      } else if (/^[1-5]$/.test(event.key)) {
        const index = parseInt(event.key) - 1;
        if (sliderRefs.current[index]) {
          sliderRefs.current[index]?.querySelector('input')?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

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
    <Card sx={{ maxWidth: 800, mx: 'auto', width: '100%', p: 5 }}>
      <CardHeader title="Polyrhythm Sandbox" action={<IconButton onClick={() => setAboutOpen(true)}><Info /></IconButton>} />
      <CardContent>
        <Stack spacing={4}>
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
                  sx={{ color: RHYTHM_COLORS[index], }}
                  valueLabelDisplay="auto"
                  ref={el => { sliderRefs.current[index] = el; }}
                />
              ))}
            </Stack>

            {/* Second column: Visualizers */}
            <Stack spacing={1} sx={{ flex: 4, justifyContent: 'space-between' }}>
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
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </Card>
  );
};

function App() {
  return (
    <PolyrhythmTrainer />
  )
}

export default App