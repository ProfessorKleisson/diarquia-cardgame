import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Plus, LogIn, Users } from "lucide-react";

import type { Room, CardAnimation } from "./types";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { ToastOverlay } from "./components/ToastOverlay";
import { AnimationOverlay } from "./components/AnimationOverlay";
import { Lobby } from "./components/Lobby";
import { Game } from "./components/Game";

const socket: Socket = io({ autoConnect: false });

export default function App() {
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [isPublicRoom, setIsPublicRoom] = useState(false);
  const [error, setError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [animationMsg, setAnimationMsg] = useState<CardAnimation | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const animationTimeoutRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Check URL for room code
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("room");
    if (codeFromUrl) {
      setJoinCode(codeFromUrl.toUpperCase());
    }

    socket.connect();

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("room_update", (updatedRoom: Room) => {
      setRoom(updatedRoom);
      setError("");
    });

    socket.on("play_animation", (data: CardAnimation) => {
      setAnimationMsg({ ...data, id: Date.now() + Math.random() });
      if (animationTimeoutRef.current !== null) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = window.setTimeout(() => setAnimationMsg(null), 3500);
    });

    socket.on("action_error", (data: { message: string }) => {
      setToastMsg(data.message);
      if (toastTimeoutRef.current !== null) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = window.setTimeout(() => setToastMsg(null), 3500);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_update");
      socket.off("play_animation");
      socket.off("action_error");
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = () => {
    if (!playerName) return setError("Please enter your name");
    socket.emit("create_room", { playerName, maxPlayers: 4, isPublic: isPublicRoom }, (res: any) => {
      if (!res.success) {
        setError(res.error);
      } else {
        window.history.pushState({}, "", `?room=${res.roomId}`);
      }
    });
  };

  const handleJoinRandomRoom = () => {
    if (!playerName) return setError("Please enter your name");
    socket.emit("join_random_room", { playerName }, (res: any) => {
      if (!res.success) {
        setError(res.error);
      } else {
        window.history.pushState({}, "", `?room=${res.roomId}`);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!playerName) return setError("Please enter your name");
    if (!joinCode) return setError("Please enter a room code");
    socket.emit("join_room", { roomId: joinCode.toUpperCase(), playerName }, (res: any) => {
      if (!res.success) {
        setError(res.error);
      } else {
        window.history.pushState({}, "", `?room=${res.roomId}`);
      }
    });
  };

  if (!room) {
    return (
      <div className="min-h-screen text-stone-100 flex items-center justify-center p-4 font-sans relative">
        <AnimatedBackground />
        <div className="max-w-md w-full bg-stone-800 p-4 md:p-8 rounded-2xl shadow-2xl border border-stone-700 relative z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-amber-500 mb-2">GOLPE</h1>
            <p className="text-stone-400">A game of philosophy, history, and betrayal.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                placeholder="Enter your name..."
              />
            </div>

            {error && <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-lg border border-red-900/50">{error}</div>}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleCreateRoom}
                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-stone-900 font-bold py-3 px-4 rounded-lg transition-colors w-full"
              >
                <Plus className="w-5 h-5 flex-shrink-0" />
                Criar Sala
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-4 py-3 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all uppercase"
                  placeholder="CÓDIGO"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinRoom}
                  className="flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-600 text-stone-100 font-bold py-3 px-4 rounded-lg transition-colors flex-shrink-0"
                  title="Entrar com Código"
                >
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline">Entrar</span>
                </button>
              </div>

              <button
                onClick={handleJoinRandomRoom}
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-stone-100 font-bold py-3 px-4 rounded-lg transition-colors w-full"
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                Sala Aleatória Pública
              </button>

              <div className="flex items-center gap-2 justify-center mt-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={isPublicRoom}
                  onChange={(e) => setIsPublicRoom(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-600 text-amber-500 focus:ring-amber-500 bg-stone-900"
                />
                <label htmlFor="isPublic" className="text-sm text-stone-400 select-none">
                  Tornar minha sala pública
                </label>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  const isMeAnimation = animationMsg ? (animationMsg.targetName === playerName || animationMsg.attackerName === playerName) : false;

  return (
    <>
      <ToastOverlay message={toastMsg} />
      <AnimationOverlay animation={animationMsg} isMe={isMeAnimation} />

      {room.status === "waiting" ? (
        <Lobby room={room} socket={socket} />
      ) : (
        <Game room={room} socket={socket} />
      )}
    </>
  );
}
