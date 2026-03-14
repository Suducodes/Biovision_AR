/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { Github, Info, X } from 'lucide-react';
import './types';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHostingInfo, setShowHostingInfo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const heartRef = useRef<any>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    // Initialize MediaPipe
    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        handLandmarkerRef.current = handLandmarker;
        setIsLoaded(true);
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };
    initMediaPipe();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    // Find the AR.js video element
    const findVideo = setInterval(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video && video.readyState >= 2) {
        clearInterval(findVideo);
        videoRef.current = video;
        startTracking();
      }
    }, 500);

    return () => clearInterval(findVideo);
  }, [isLoaded]);

  const startTracking = () => {
    let lastVideoTime = -1;
    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const handLandmarker = handLandmarkerRef.current;
      const heart = heartRef.current;

      if (video && canvas && handLandmarker && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        
        // Match canvas size to video size
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
        
        // Match AR.js injected styles for perfect overlay alignment
        canvas.style.width = video.style.width;
        canvas.style.height = video.style.height;
        canvas.style.marginLeft = video.style.marginLeft;
        canvas.style.marginTop = video.style.marginTop;

        const results = handLandmarker.detectForVideo(video, performance.now());
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (results.landmarks && results.landmarks.length > 0) {
            // Draw Sci-Fi Neon Lines
            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00ffff";
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 3;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            for (const landmarks of results.landmarks) {
              // Draw connections (simplified hand skeleton)
              const drawLine = (i: number, j: number) => {
                ctx.beginPath();
                ctx.moveTo(landmarks[i].x * canvas.width, landmarks[i].y * canvas.height);
                ctx.lineTo(landmarks[j].x * canvas.width, landmarks[j].y * canvas.height);
                ctx.stroke();
              };

              // Thumb
              drawLine(0, 1); drawLine(1, 2); drawLine(2, 3); drawLine(3, 4);
              // Index
              drawLine(0, 5); drawLine(5, 6); drawLine(6, 7); drawLine(7, 8);
              // Middle
              drawLine(5, 9); drawLine(9, 10); drawLine(10, 11); drawLine(11, 12);
              // Ring
              drawLine(9, 13); drawLine(13, 14); drawLine(14, 15); drawLine(15, 16);
              // Pinky
              drawLine(13, 17); drawLine(0, 17); drawLine(17, 18); drawLine(18, 19); drawLine(19, 20);

              // Draw neon joints
              ctx.fillStyle = "#ffffff";
              ctx.shadowBlur = 20;
              ctx.shadowColor = "#ff00ff";
              for (const lm of landmarks) {
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
            ctx.restore();

            // Use wrist (landmark 0) to rotate the heart
            if (heart) {
              const wrist = results.landmarks[0][0];
              // Map wrist X/Y to rotation
              // X goes from 0 to 1 -> rotate Y
              // Y goes from 0 to 1 -> rotate X
              const rotX = (wrist.y - 0.5) * 360;
              const rotY = (wrist.x - 0.5) * 360;
              
              heart.setAttribute('rotation', `${rotX} ${rotY} 0`);
            }
          }
        }
      }
      requestRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-transparent pointer-events-none">
      {/* A-Frame Scene */}
      <div className="absolute inset-0 pointer-events-auto z-0">
        <a-scene
          embedded
          arjs="sourceType: webcam; debugUIEnabled: false; trackingMethod: best;"
          vr-mode-ui="enabled: false"
          renderer="antialias: true; alpha: true"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        >
          <a-marker preset="hiro">
            {/* Placeholder for Draco-compressed .glb heart */}
            {/* Replace this with your actual model:
                <a-entity gltf-model="url(path/to/heart.glb)" scale="0.5 0.5 0.5" position="0 0.5 0"></a-entity>
            */}
            <a-entity
              ref={heartRef}
              geometry="primitive: torusKnot; radius: 0.5; radiusTubular: 0.1; p: 2; q: 3"
              material="color: #ff0055; metalness: 0.8; roughness: 0.2; emissive: #440011"
              position="0 0.5 0"
              scale="0.5 0.5 0.5"
              animation="property: rotation; to: 0 360 0; loop: true; dur: 10000; easing: linear"
            ></a-entity>
            
            {/* Sci-fi base ring */}
            <a-entity
              geometry="primitive: ring; radiusInner: 0.8; radiusOuter: 0.9"
              material="color: #00ffff; emissive: #00ffff; side: double; transparent: true; opacity: 0.8"
              rotation="-90 0 0"
              animation="property: rotation; to: -90 360 0; loop: true; dur: 5000; easing: linear"
            ></a-entity>
          </a-marker>
          <a-entity camera></a-entity>
        </a-scene>
      </div>

      {/* Canvas for Sci-Fi Hand Tracking Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ zIndex: 10 }}
      />

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 z-20 text-white font-mono bg-black/60 p-4 rounded-xl border border-cyan-500/50 backdrop-blur-md pointer-events-auto shadow-[0_0_15px_rgba(0,255,255,0.3)]">
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-1">
          Bio-Vision AR
        </h1>
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${isLoaded ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-yellow-400 animate-pulse'}`}></div>
          <p className="text-sm text-cyan-100/80">
            {isLoaded ? 'Neural Link Active' : 'Initializing AI...'}
          </p>
        </div>
        <ul className="text-xs text-cyan-100/70 max-w-xs space-y-1 mb-4">
          <li>1. Point camera at a <b>Hiro marker</b>.</li>
          <li>2. Show your hand to the camera.</li>
          <li>3. Move wrist to rotate the 3D model.</li>
        </ul>
        
        <button 
          onClick={() => setShowHostingInfo(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-cyan-900/50 hover:bg-cyan-800/50 border border-cyan-500/50 rounded-lg text-xs transition-colors"
        >
          <Github size={14} />
          <span>Hosting Guide</span>
        </button>
      </div>

      {/* Hosting Info Modal */}
      {showHostingInfo && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto p-4">
          <div className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(0,255,255,0.2)] font-mono text-cyan-50">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2">
                <Info size={20} />
                Hosting on GitHub Pages
              </h2>
              <button onClick={() => setShowHostingInfo(false)} className="text-cyan-500 hover:text-cyan-300">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-cyan-100/80">
              <p>
                Yes! <b>GitHub Pages</b> is the perfect free hosting solution for this WebXR app. 
                WebXR and camera access require a secure context (HTTPS), which GitHub Pages provides by default.
              </p>
              
              <div className="bg-black/50 p-3 rounded-lg border border-cyan-900">
                <h3 className="text-cyan-300 font-bold mb-2">Deployment Steps:</h3>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Run <code className="text-pink-400">npm run build</code> to generate the static files in the <code className="text-pink-400">dist/</code> folder.</li>
                  <li>Create a new GitHub repository.</li>
                  <li>Push your code to the repository.</li>
                  <li>Go to Repo Settings &gt; Pages.</li>
                  <li>Select "GitHub Actions" or deploy from a branch (e.g., <code className="text-pink-400">gh-pages</code>).</li>
                </ol>
              </div>
              
              <p className="text-xs text-cyan-500">
                Note: Ensure your 3D models (.glb) and marker files (.patt) are placed in the <code className="text-pink-400">public/</code> directory so they are served correctly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
