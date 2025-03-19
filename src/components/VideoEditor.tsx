import { useRef, useState, useEffect } from 'react';
import {
  formatTime,
  parseTimeToSeconds,
  isValidTimeFormat,
} from '../utils/timeUtils';

interface VideoSection {
  inicio: string;
  fin: string;
}

interface TimeInputProps {
  inicio: string;
  fin: string;
  onPlay: (inicio: string, fin: string) => void; // Nueva función para reproducir la selección
  onDelete: () => void;
}

function TimeInputRow({ inicio, fin, onPlay, onDelete }: TimeInputProps) {
  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3">
      <div className="flex-1 grid grid-cols-2 gap-2">
        <div className="text-purple-300">Inicio: {inicio}</div>
        <div className="text-purple-300">Fin: {fin}</div>
      </div>
      <button
        onClick={() => onPlay(inicio, fin)} // Pasar inicio y fin al botón de reproducción
        className="p-2 bg-green-500 rounded hover:bg-green-600"
      >
        <span className="text-white">▶</span>
      </button>
      <button
        onClick={() => onDelete()}
        className="p-2 bg-red-500 rounded hover:bg-red-600"
      >
        <span className="text-white">✕</span>
      </button>
    </div>
  );
}

export default function VideoEditor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sections, setSections] = useState<VideoSection[]>([]);
  const [currentSection, setCurrentSection] = useState<Partial<VideoSection>>({
    inicio: '',
    fin: '',
  });
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState<'original' | 'sections'>('original');
  const [timeError, setTimeError] = useState<{ inicio?: string; fin?: string }>(
    {}
  );

  const handleTimeUpdate = () => {
    if (!videoRef.current || sections.length === 0 || playMode === 'original')
      return;

    const currentTime = videoRef.current.currentTime;
    const currentSec = sections[currentSectionIndex];

    if (currentTime >= parseTimeToSeconds(currentSec.fin)) {
      if (currentSectionIndex < sections.length - 1) {
        setCurrentSectionIndex((prev) => prev + 1);
        videoRef.current.currentTime = parseTimeToSeconds(
          sections[currentSectionIndex + 1].inicio
        );
      } else {
        setCurrentSectionIndex(0);
        videoRef.current.currentTime = parseTimeToSeconds(sections[0].inicio);
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSetCurrentTime = (type: 'inicio' | 'fin') => {
    if (!videoRef.current) return;
    const currentTime = formatTime(Math.floor(videoRef.current.currentTime));
    setCurrentSection((prev) => ({
      ...prev,
      [type]: currentTime,
    }));
    setTimeError((prev) => ({ ...prev, [type]: undefined }));
  };

  const formatInputTime = (value: string): string => {
    // Elimina cualquier carácter no numérico
    const numericValue = value.replace(/\D/g, '');

    // Asegúrate de que no sea mayor a 4 dígitos
    const paddedValue = numericValue.padStart(4, '0').slice(-4);

    // Divide los últimos dos dígitos como segundos y los primeros como minutos
    const minutes = paddedValue.slice(0, 2);
    const seconds = paddedValue.slice(2);

    return `${minutes}:${seconds}`;
  };

  const handleTimeInput = (type: 'inicio' | 'fin', value: string) => {
    // Formatea el valor ingresado
    const formattedValue = formatInputTime(value);

    setCurrentSection((prev) => ({
      ...prev,
      [type]: formattedValue,
    }));

    // Validar el formato del tiempo
    if (formattedValue && !isValidTimeFormat(formattedValue)) {
      setTimeError((prev) => ({
        ...prev,
        [type]: 'Formato inválido. Use mm:ss (ejemplo: 05:30)',
      }));
    } else {
      setTimeError((prev) => ({ ...prev, [type]: undefined }));
    }
  };

  const handleAddSection = () => {
    if (!currentSection.inicio || !currentSection.fin) return;
    if (
      !isValidTimeFormat(currentSection.inicio) ||
      !isValidTimeFormat(currentSection.fin)
    )
      return;

    const inicioInSeconds = parseTimeToSeconds(currentSection.inicio);
    const finInSeconds = parseTimeToSeconds(currentSection.fin);

    if (inicioInSeconds >= finInSeconds) {
      alert('El tiempo inicial debe ser menor al tiempo final.');
      return;
    }

    // Agregar la nueva sección y ordenar por tiempo de inicio
    const updatedSections = [...sections, currentSection as VideoSection].sort(
      (a, b) => parseTimeToSeconds(a.inicio) - parseTimeToSeconds(b.inicio)
    );

    setSections(updatedSections);
    setCurrentSection({ inicio: '', fin: '' });
    setTimeError({});
  };

  const handlePlaySections = () => {
    if (!videoRef.current || sections.length === 0) return;

    // Ordenar las secciones antes de reproducir
    const sortedSections = [...sections].sort(
      (a, b) => parseTimeToSeconds(a.inicio) - parseTimeToSeconds(b.inicio)
    );
    setSections(sortedSections);

    setCurrentSectionIndex(0);
    videoRef.current.currentTime = parseTimeToSeconds(sortedSections[0].inicio);
    videoRef.current.play();
    setIsPlaying(true);
  };

  const handleRemoveSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };

  const clearSections = () => {
    setSections([]);
    setCurrentSection({ inicio: '', fin: '' });
    setTimeError({});
  };

  const togglePlayMode = () => {
    setPlayMode((prev) => (prev === 'original' ? 'sections' : 'original'));
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [sections, currentSectionIndex, playMode]);

  return (
    <div className="min-h-screen bg-gray-900 p-8 flex items-center ">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl overflow-hidden bg-gray-800 p-4">
            <video
              ref={videoRef}
              controls
              className="w-full rounded-lg"
              src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
            />
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl text-purple-300 mb-4">Título del video</h2>
            <p className="text-gray-400">
              Información adicional Información adicional Información adicional
            </p>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex gap-4 mb-6">
            <button
              onClick={togglePlayMode}
              className={`flex-1 py-2 px-4 rounded-lg ${
                playMode === 'sections'
                  ? 'bg-purple-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              {playMode === 'sections' ? 'Modo Recortes' : 'Modo Original'}
            </button>
            <button
              onClick={toggleMute}
              className={`flex-1 py-2 px-4 rounded-lg ${
                isMuted
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </div>

          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-purple-300 mb-2">
                  Inicio
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={currentSection.inicio}
                      onChange={(e) =>
                        handleTimeInput('inicio', e.target.value)
                      }
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      placeholder="00:00"
                    />
                    {timeError.inicio && (
                      <p className="text-red-400 text-xs mt-1">
                        {timeError.inicio}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSetCurrentTime('inicio')}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded"
                  >
                    Set
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-purple-300 mb-2">
                  Fin
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={currentSection.fin}
                      onChange={(e) => handleTimeInput('fin', e.target.value)}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                      placeholder="00:00"
                    />
                    {timeError.fin && (
                      <p className="text-red-400 text-xs mt-1">
                        {timeError.fin}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSetCurrentTime('fin')}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded"
                  >
                    Set
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={handleAddSection}
              disabled={
                !currentSection.inicio ||
                !currentSection.fin ||
                Object.values(timeError).some((error) => error !== undefined) // Cambiado aquí
              }
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 rounded"
            >
              Add selection
            </button>
          </div>

          <div className="space-y-3 mb-6">
            {sections.map((section, index) => (
              <TimeInputRow
                key={index}
                inicio={section.inicio}
                fin={section.fin}
                onPlay={(inicio, fin) => {
                  if (!videoRef.current) return;

                  videoRef.current.currentTime = parseTimeToSeconds(inicio);
                  videoRef.current.play();

                  const handleStopAtEnd = () => {
                    if (
                      videoRef.current &&
                      videoRef.current.currentTime >= parseTimeToSeconds(fin)
                    ) {
                      videoRef.current.pause();
                      videoRef.current.removeEventListener(
                        'timeupdate',
                        handleStopAtEnd
                      );
                    }
                  };

                  videoRef.current.addEventListener(
                    'timeupdate',
                    handleStopAtEnd
                  );
                }}
                onDelete={() => handleRemoveSection(index)}
              />
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handlePlaySections}
              disabled={sections.length === 0 || playMode === 'original'}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg"
            >
              Play All
            </button>
            <button
              onClick={clearSections}
              disabled={sections.length === 0}
              className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
