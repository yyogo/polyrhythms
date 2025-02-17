import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Plus, Minus } from 'lucide-react';

// Color palette for rhythms
const RHYTHM_COLORS = [
  'rgb(59, 130, 246)', // Blue
  'rgb(16, 185, 129)', // Green
  'rgb(239, 68, 68)',  // Red
  'rgb(217, 119, 6)',  // Orange
  'rgb(139, 92, 246)'  // Purple
];

const BeatVisualizer = ({ beats, currentBeat, isPlaying, color }) => (
  <div className="grid gap-1 w-full" style={{ 
    gridTemplateColumns: `repeat(${beats}, 1fr)`,
  }}>
    {Array.from({ length: beats }).map((_, index) => (
      <div
        key={index}
        className="h-6 w-full transition-colors duration-100 border"
        style={{
          backgroundColor: isPlaying && index === currentBeat ? color : 'rgb(229, 231, 235)',
          borderColor: color
        }}
      />
    ))}
  </div>
);

const PolyrhythmTrainer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(60);
  const [rhythms, setRhythms] = useState([
    { id: 1, beats: 4, enabled: true },
    { id: 2, beats: 3, enabled: true },
  ]);
  const [currentBeats, setCurrentBeats] = useState([0, 0]);
  
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = (frequency) => {
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

    const tick = (timestamp) => {
      const elapsedTime = timestamp - startTimeRef.current;
      const beatDuration = (60 / bpm) * 1000;

      const newBeats = rhythms.map((rhythm, index) => {
        if (!rhythm.enabled) return 0;
        
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

  const handleBpmChange = (value) => {
    setBpm(value[0]);
  };

  const updateRhythm = (id, beats) => {
    setRhythms(prev => prev.map(rhythm =>
      rhythm.id === id ? { ...rhythm, beats: parseInt(beats) } : rhythm
    ));
  };

  const toggleRhythm = (id) => {
    setRhythms(prev => prev.map(rhythm =>
      rhythm.id === id ? { ...rhythm, enabled: !rhythm.enabled } : rhythm
    ));
  };

  const addRhythm = () => {
    if (rhythms.length < 5) {
      setRhythms(prev => [
        ...prev,
        { id: Math.max(...prev.map(r => r.id)) + 1, beats: 4, enabled: true }
      ]);
      setCurrentBeats(prev => [...prev, 0]);
    }
  };

  const removeRhythm = (id) => {
    const index = rhythms.findIndex(r => r.id === id);
    setRhythms(prev => prev.filter(rhythm => rhythm.id !== id));
    setCurrentBeats(prev => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Polyrhythm Trainer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tempo (BPM): {bpm}</label>
          <Slider
            value={[bpm]}
            onValueChange={handleBpmChange}
            min={30}
            max={200}
            step={1}
            className="w-full"
          />
        </div>
        
        <div className="space-y-4">
          {rhythms.map((rhythm, index) => (
            <div key={rhythm.id} className="space-y-2">
              <div className="flex items-center space-x-4">
                <Button
                  variant={rhythm.enabled ? "default" : "secondary"}
                  size="sm"
                  onClick={() => toggleRhythm(rhythm.id)}
                  style={{
                    backgroundColor: rhythm.enabled ? RHYTHM_COLORS[index] : undefined
                  }}
                >
                  {rhythm.enabled ? "Enabled" : "Disabled"}
                </Button>
                
                <Select
                  value={rhythm.beats.toString()}
                  onValueChange={(value) => updateRhythm(rhythm.id, value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 7].map((beats) => (
                      <SelectItem key={beats} value={beats.toString()}>
                        {beats}/4
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {rhythms.length > 2 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => removeRhythm(rhythm.id)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <BeatVisualizer
                beats={rhythm.beats}
                currentBeat={currentBeats[index]}
                isPlaying={isPlaying && rhythm.enabled}
                color={RHYTHM_COLORS[index]}
              />
            </div>
          ))}
        </div>
        
        {rhythms.length < 5 && (
          <Button variant="outline" onClick={addRhythm}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rhythm
          </Button>
        )}
        
        <Button
          className="w-full"
          size="lg"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <><Pause className="mr-2 h-4 w-4" /> Stop</>
          ) : (
            <><Play className="mr-2 h-4 w-4" /> Start</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default PolyrhythmTrainer;