import React from "react";
import type { Socket } from "socket.io-client";
import { Copy, Users, Crown, Play } from "lucide-react";
import { cn } from "../utils/cn";
import type { Room } from "../types";
import { AnimatedBackground } from "./AnimatedBackground";

export function Lobby({ room, socket }: { room: Room; socket: Socket }) {
    const isHost = room.host === socket.id;
    const me = room.players.find((p) => p.id === socket.id);
    const allReady = room.players.every((p) => p.isReady);

    const copyCode = () => {
        navigator.clipboard.writeText(room.id);
    };

    const copyLink = () => {
        const url = new URL(window.location.href);
        url.searchParams.set("room", room.id);
        navigator.clipboard.writeText(url.toString());
    };

    return (
        <div className="min-h-screen text-stone-100 p-4 md:p-8 font-sans relative">
            <AnimatedBackground />
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                    <div className="w-full md:w-auto text-center md:text-left">
                        <h1 className="text-3xl font-bold text-amber-500">Waiting Room</h1>
                        <div className="flex flex-col gap-2 mt-4">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full">
                                <span className="text-stone-400">Room Code:</span>
                                <code className="bg-stone-800 px-3 py-1 rounded-md text-xl font-mono text-amber-400 tracking-wider">
                                    {room.id}
                                </code>
                                <button
                                    onClick={copyCode}
                                    className="p-2 hover:bg-stone-800 rounded-md transition-colors text-stone-400 hover:text-stone-200"
                                    title="Copy Room Code"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full">
                                <span className="text-stone-400">Invite Link:</span>
                                <code className="bg-stone-800 px-3 py-1 rounded-md text-sm font-mono text-amber-400/80 truncate max-w-[200px] sm:max-w-[300px]">
                                    {`${window.location.origin}${window.location.pathname}?room=${room.id}`}
                                </code>
                                <button
                                    onClick={copyLink}
                                    className="p-2 hover:bg-stone-800 rounded-md transition-colors text-stone-400 hover:text-stone-200"
                                    title="Copy Invite Link"
                                >
                                    <Copy className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                            room.expansionEnabled ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-stone-800 text-stone-500 border border-stone-700"
                        )}>
                            <Play className="w-4 h-4" />
                            <span>Expansão: {room.expansionEnabled ? "ON" : "OFF"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-stone-400 bg-stone-800 px-4 py-2 rounded-full border border-stone-700">
                            <Users className="w-5 h-5" />
                            <span>{room.players.length} / {room.maxPlayers}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {room.players.map((player) => (
                        <div
                            key={player.id}
                            className={cn(
                                "bg-stone-800 p-6 rounded-xl border-2 flex items-center justify-between transition-all",
                                player.isReady ? "border-emerald-500/50" : "border-stone-700",
                                player.id === socket.id ? "ring-2 ring-amber-500/20" : ""
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold",
                                    player.isReady ? "bg-emerald-500/20 text-emerald-400" : "bg-stone-700 text-stone-400"
                                )}>
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-semibold text-lg flex items-center gap-2">
                                        {player.name}
                                        {player.id === room.host && <Crown className="w-4 h-4 text-amber-500" />}
                                    </div>
                                    <div className={cn(
                                        "text-sm",
                                        player.isReady ? "text-emerald-400" : "text-stone-500"
                                    )}>
                                        {player.isReady ? "Ready" : "Not Ready"}
                                    </div>
                                </div>
                            </div>
                            {player.id === socket.id && (
                                <button
                                    onClick={() => socket.emit("toggle_ready", { roomId: room.id })}
                                    className={cn(
                                        "px-6 py-2 rounded-full font-medium transition-colors",
                                        player.isReady
                                            ? "bg-stone-700 hover:bg-stone-600 text-stone-300"
                                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    )}
                                >
                                    {player.isReady ? "Cancel" : "Ready Up"}
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Empty slots */}
                    {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="bg-stone-800/50 border-2 border-dashed border-stone-700 p-6 rounded-xl flex items-center justify-center text-stone-500">
                            Waiting for player...
                        </div>
                    ))}
                </div>

                {isHost && (
                    <div className="flex flex-col items-center gap-6">
                        <div className="flex items-center gap-3 bg-stone-800 p-4 rounded-xl border border-stone-700">
                            <span className="text-stone-300 font-medium">Expansão (República & Anarquismo)</span>
                            <button
                                onClick={() => socket.emit("toggle_expansion", { roomId: room.id })}
                                className={cn(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                    room.expansionEnabled ? "bg-amber-600" : "bg-stone-600"
                                )}
                            >
                                <span
                                    className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                        room.expansionEnabled ? "translate-x-6" : "translate-x-1"
                                    )}
                                />
                            </button>
                        </div>
                        <button
                            onClick={() => socket.emit("start_game", { roomId: room.id })}
                            disabled={room.players.length < 2 || !allReady}
                            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 disabled:cursor-not-allowed text-stone-900 font-bold py-4 px-8 rounded-xl text-lg transition-all shadow-lg"
                        >
                            <Play className="w-6 h-6" />
                            Start Game
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
