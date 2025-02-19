import React, { useState, useEffect, useRef, useCallback, Ref } from 'react';
import {
  Card, CardContent, Typography, Slider, IconButton, Stack, Box, Button,
  Tooltip, CardHeader, Modal,
  CardActions, Dialog, DialogTitle, DialogContent, DialogActions,
  ButtonGroup,
  Fab,
  useColorScheme
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Pause from '@mui/icons-material/Pause';
import TouchApp from '@mui/icons-material/TouchApp';
import Info from '@mui/icons-material/Info';
import Close from '@mui/icons-material/Close';
import RestartAlt from '@mui/icons-material/RestartAlt';
import GitHubIcon from '@mui/icons-material/GitHub';
import FocusTrap from '@mui/material/Unstable_TrapFocus';
import LightMode from '@mui/icons-material/LightMode';
import DarkMode from '@mui/icons-material/DarkMode';


const BeatVisualizerComponent = ({ beats, currentBeat, color }: { beats: number, currentBeat: number | null, color: string }) => {
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
            backgroundColor: index === currentBeat ? color : `color-mix(in srgb, ${color}, 80% transparent)`,
            transition: 'background-color 100ms',
            textAlign: 'center',
            color: index === currentBeat ? 'common.white' : 'text.secondary',
            fontSize: '0.875rem'
          }}
        >
          {index + 1}
        </Box>
      ))}
    </Box>
  );
};

const BeatVisualizer = React.memo(BeatVisualizerComponent);

const AboutModal = ({ open, onClose }: { open: boolean, onClose: () => void }) => (
  <Modal open={open} onClose={onClose}>

    <Card sx={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: 800,
      width: '70%',
      maxHeight: '80vh',
      overflow: 'auto',
      p: { xs: 2, sm: 4 },
      m: { xs: 2, sm: 4 }
    }}>
      <CardHeader title="About" action={<IconButton size="small" onClick={onClose}><Close /></IconButton>} />
      <CardContent>
        <section>
          <h3>What is a Polyrhythm?</h3>
          <p>A <b>polyrhythm</b> happens when two or more different rhythms are played at the same time. For example, if one hand plays 3 beats while the other plays 2 beats in the same time span, that's a 3:2 polyrhythm. It creates interesting patterns that might sound complex at first, but they occur naturally in many styles of music around the world.</p>
          <p>This app helps you practice or play around with polyrhythms by visualizing and playing multiple rhythms simultaneously.</p>
        </section>
        <section>
          <h3>Instructions</h3>
          <p>Select the beat count (1-11) for each rhythm using the sliders. Set a slider to 0 to disable that rhythm.</p>
          <p>Adjust tempo using the BPM slider or tap the tempo button repeatedly.</p>
          <p>Press the play button to start the rhythms. The visualizer will show the current beat for each rhythm.</p>
        </section>
        <Box component='section' sx={{ display: { xs: 'none', sm: 'block' } }}>
          <h3>Keyboard Shortcuts</h3>
          <table>
            <tbody>
              <tr><td><kbd data-key="Space">Space</kbd></td><td>Play/Pause</td></tr>
              <tr><td><kbd>1</kbd>-<kbd>5</kbd></td><td>Focus rhythm sliders</td></tr>
              <tr><td><kbd>Q</kbd>/<kbd>E</kbd>/<kbd>W</kbd></td><td>Increase/decrease/tap tempo (hold <kbd data-key="Shift">Shift</kbd> for smaller increment)</td></tr>
              <tr><td><kbd>R</kbd></td><td>Reset playground</td></tr>
            </tbody>
          </table>
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" href="https://github.com/yyogo/polyrhythms" target="_blank"><GitHubIcon fontSize="small" />&nbsp;Source Code</Button>
      </CardActions>
    </Card>
  </Modal>
);

const ResetConfirmationModal = ({ open, onConfirm, onClose }: { open: boolean, onConfirm: () => void, onClose: () => void }) => (
  <FocusTrap open={open}>
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Reset Playground</DialogTitle>
      <DialogContent>
        Are you sure you want to reset the playground?
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onConfirm} color="error" variant="contained">Reset</Button>
      </DialogActions>
    </Dialog>
  </FocusTrap>
);

const MeasureCursor = React.memo(({ ref }: { ref: Ref<HTMLDivElement> }) => {
  return <div
    style={{
      position: 'absolute',
      top: 0,
      height: '100%',
      width: '4px',
      backgroundColor: 'rgba(255, 250, 195, 0.8)',
      boxShadow: '0 0 8px rgba(0, 0, 0, 0.3)',
      zIndex: 2,
      transition: 'left linear',
      transitionDuration: '0ms',
    }}
    ref={ref}
  />
})

const RhythmSlider = React.memo(({ index, rhythm, onChange, ref }:
  { index: number, rhythm: number, onChange: (value: number) => void, ref: (el: HTMLElement) => void }) => {
  return <Slider
    key={index}
    value={rhythm}
    size="small"
    min={0}
    marks
    max={11}
    onChange={(_, value) => onChange(value as number)}
    sx={{ color: `var(--rhythm-color-${index + 1})`, }}
    valueLabelDisplay="auto"
    ref={ref}
  />
})

type Envelope = {
  delay?: number;
  gain: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};

function createEnvelope(
  audioContext: AudioContext,
  source: AudioScheduledSourceNode,
  envelope: Envelope
): GainNode {
  const gainNode = audioContext.createGain();
  const start = audioContext.currentTime + (envelope.delay || 0);

  source.connect(gainNode);
  gainNode.gain.setValueAtTime(0.001, start);
  // Attack
  gainNode.gain.linearRampToValueAtTime(envelope.gain, start + envelope.attack);
  // Decay
  gainNode.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, envelope.sustain * envelope.gain),
    start + envelope.attack + envelope.decay
  );
  // Release
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    start + envelope.attack + envelope.decay + envelope.release
  );

  source.start(start);
  source.stop(start + envelope.attack + envelope.decay + envelope.release + 0.01);
  source.onended = () => {
    source.disconnect();
    gainNode.disconnect();
  };

  return gainNode; // Allow chaining
}

const PolyrhythmPlayground = () => {
  const { colorScheme, setColorScheme } = useColorScheme();

  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [rhythms, setRhythms] = useState([4, 3, 0, 0, 0]);
  const [currentBeats, setCurrentBeats] = useState<Array<number | null>>([null, null, null, null, null]);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const measurePosRef = useRef(0);

  const tapTimestampsRef = useRef<number[]>([]);
  const tapTimeoutRef = useRef<number | null>(null);
  // for keyboard shortcuts
  const sliderRefs = useRef<(HTMLElement | null)[]>([]);

  const measureCursorRefs = rhythms.map(() => useRef<HTMLDivElement | null>(null));
  const lastTickRef = useRef(0);

  const handleReset = () => {
    setResetConfirmOpen(true);
  };

  const confirmReset = () => {
    setResetConfirmOpen(false);
    setIsPlaying(false);
    setBpm(60);
    setRhythms([4, 3, 0, 0, 0]);
  };

  // Add keyboard event handler
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Ignore key events if user is typing in an input
    if ((event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
      && !(event.target.closest('.MuiSlider-root'))) {
      return;
    }
    if (resetConfirmOpen) {
      if (event.code === 'Space' || event.code === 'Enter') {
        event.preventDefault();
        confirmReset();
      }
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
    } else if (event.key === 'r' && !event.metaKey && !event.ctrlKey && !event.metaKey) {
      handleReset();
    } else if (/^[1-5]$/.test(event.key)) {
      const index = parseInt(event.key) - 1;
      if (sliderRefs.current[index]) {
        sliderRefs.current[index]?.querySelector('input')?.focus();
      }
    }
  }, [resetConfirmOpen]);
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

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
        audioContextRef.current = null;
      }
    };
  }, []);

  // Clean up tap tempo timeout when component unmounts
  useEffect(() => {
    return () => {
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (!isPlaying) {
      setCurrentBeats(new Array(rhythms.length).fill(null));
      measurePosRef.current = 0;
      lastTickRef.current = 0;
      return;
    }


    // Animation frame logic (remains largely the same)
    const measureLength = (60 / bpm) * 1000 * 4;
    let previousBeats = [...currentBeats];
    lastTickRef.current = lastTickRef.current || performance.now();

    const tick = (timestamp: DOMHighResTimeStamp) => {
      const delta = timestamp - lastTickRef.current;
      lastTickRef.current = timestamp;

      const newMeasurePos = (measurePosRef.current + delta / measureLength) % 1;
      let beatsChanged = false;

      rhythms.forEach((rhythm, index) => {
        const currentBeat = Math.floor(newMeasurePos * rhythm);
        if (rhythm && (currentBeat !== previousBeats[index] || measurePosRef.current > newMeasurePos)) {
          playBeat(index);
          beatsChanged = true;
          previousBeats[index] = currentBeat;
        }
      });

      if (beatsChanged) {
        setCurrentBeats([...previousBeats]);
      }

      measurePosRef.current = newMeasurePos;
      measureCursorRefs.forEach(ref => ref.current?.style.setProperty('left', `${newMeasurePos * 100}%`));
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, bpm, rhythms, ...measureCursorRefs]);

  const playBeat = (index: number) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 220 * (index + 1);

    createEnvelope(audioContextRef.current, oscillator, {
      gain: 0.2,      // Set gain to 20% to prevent clipping
      attack: 0.002,  // Short attack to prevent clicks
      decay: 0.05,    // Short decay for a percussive sound
      sustain: 0.3,   // Sustain at 30%
      release: 0.1    // Short release
    }).connect(audioContextRef.current.destination);
  };

  const handleBpmChange = (value: number[]) => {
    setBpm(value[0]);
  };

  const updateRhythm = (id: number, beats: number) => {
    setRhythms(prev => prev.map((orig, index) => id === index ? beats : orig));
  };

  return (
    <>
      <Card sx={{
        maxWidth: 800,
        mx: 'auto',
        width: '90%',
        p: { xs: 2, sm: 5 }
      }}>
        <CardHeader
          sx={{ p: { xs: 1, sm: 2 } }}
          title="Polyrhythm Playground"
          slotProps={{ title: { variant: "body1" } }}
          action={
            <ButtonGroup>
              <IconButton onClick={() => setAboutOpen(true)}><Info /></IconButton>
              <IconButton onClick={handleReset} sx={{ display: { xs: 'none', sm: 'flex' } }}><RestartAlt /></IconButton>
              <IconButton onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}>
                {colorScheme === 'dark' ?
                  <LightMode /> :
                  <DarkMode />
                }
              </IconButton>
            </ButtonGroup>
          }
        />
        <CardContent>
          <Stack spacing={4}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
              <IconButton
                size="large"
                color={isPlaying ? "secondary" : "primary"}
                sx={{ display: { xs: 'none', sm: 'flex', border: '1px solid ' } }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause /> : <PlayArrowIcon />}
              </IconButton>
              <Slider
                value={bpm}
                onChange={(_, value) => handleBpmChange([value as number])}
                min={30}
                max={200}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 'fit-content' }}>
                <Typography width='4em' sx={{ textAlign: 'left' }}>
                  ♩ = {bpm}
                </Typography>
                <Tooltip title="Tap to set tempo">
                  <IconButton size="small" onClick={handleTap} color="primary">
                    <TouchApp />
                  </IconButton>
                </Tooltip>
              </Box>
            </Stack>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
              {/* First column: Sliders */}
              <Stack direction="column" sx={{ flex: 1, justifyContent: 'space-between' }}>
                {rhythms.map((rhythm, index) => (
                  <RhythmSlider
                    key={index}
                    index={index}
                    rhythm={rhythm}
                    onChange={value => updateRhythm(index, value)}
                    ref={el => { sliderRefs.current[index] = el; }}
                  />
                ))}
              </Stack>

              {/* Second column: Visualizers */}
              <Stack spacing={1} sx={{ flex: 4, justifyContent: 'space-between' }}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <Box key={index} sx={{ position: 'relative' }}>
                    {isPlaying && (
                      <MeasureCursor ref={measureCursorRefs[index]} />
                    )}
                    <BeatVisualizer
                      beats={rhythms[index]}
                      currentBeat={isPlaying ? currentBeats[index] : null}
                      color={`var(--rhythm-color-${index + 1})`}
                    />
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Fab color={isPlaying ? "secondary" : "primary"} aria-label="play"
        sx={{ display: { sm: 'none', }, position: 'fixed', bottom: 16, right: 16 }}
        size='large'
        onClick={() => setIsPlaying(!isPlaying)}>
        {isPlaying ? <Pause /> : <PlayArrowIcon />}
      </Fab>
      <Fab color="error" aria-label="reset"
        onClick={() => setResetConfirmOpen(true)}
        sx={{ display: { sm: 'none', }, position: 'fixed', bottom: 16, left: 16 }}>
        <RestartAlt />
      </Fab>
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <ResetConfirmationModal
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={confirmReset}
      />

    </>
  );
};

function App() {
  return (
      <PolyrhythmPlayground />
  )
}

export default App;