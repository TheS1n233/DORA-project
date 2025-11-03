// client/src/components/CoWatchController.tsx
// React controller for Co-Watch: leader can share screen or synchronize an external media URL

import React, { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, createLocalScreenTracks, LocalTrackPublication } from "livekit-client";
import { CoWatchSync } from "../lib/livekit/cowatch";

type Props = {
  room: Room;                // already connected livekit Room
  roomName: string;          // human-readable room name
  identity: string;          // operator id or display name
  role: "leader" | "follower";
  onRttUpdate?: (avgRttMs: number) => void;
  onScreenShareChange?: (active: boolean) => void;
};

export default function CoWatchController(props: Props) {
  const { room, roomName, identity, role } = props;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState<string>("");
  const [screenPub, setScreenPub] = useState<LocalTrackPublication | null>(null);
  const [status, setStatus] = useState<"idle"|"loaded"|"playing"|"paused">("idle");

  // init sync
  useEffect(() => {
    if (!room || !videoRef.current) return;
    const sync = new CoWatchSync(room, {
      role,
      roomName,
      identity,
      onRtt: (r) => props.onRttUpdate?.(r),
    });
    sync.attachVideo(videoRef.current);
    sync.start();
    return () => sync.stop();
  }, [room, role, roomName, identity]);

  // receive remote screenshare for followers: auto-show as <video> remote overlay if needed
  useEffect(() => {
    const onTrackPub = () => {
      const remoteScreen = [...room.remoteParticipants.values()]
        .flatMap((p) => [...p.tracks.values()])
        .find((pub) => pub.track?.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare);

      // Here we simply rely on your existing UI to render remote tracks.
      // If you need a direct mount, you can attach track to a separate <video> element.
    };
    room.on(RoomEvent.ParticipantConnected, onTrackPub);
    room.on(RoomEvent.TrackSubscribed, onTrackPub);
    onTrackPub();
    return () => {
      room.off(RoomEvent.ParticipantConnected, onTrackPub);
      room.off(RoomEvent.TrackSubscribed, onTrackPub);
    };
  }, [room]);

  async function startScreenshare() {
    // create and publish screen tracks
    const tracks = await createLocalScreenTracks({ audio: true }); // include system audio if supported
    for (const t of tracks) {
      const pub = await room.localParticipant.publishTrack(t, { source: Track.Source.ScreenShare });
      setScreenPub(pub);
    }
    props.onScreenShareChange?.(true);
  }

  async function stopScreenshare() {
    if (screenPub) {
      await room.localParticipant.unpublishTrack(screenPub.track!, true);
      setScreenPub(null);
    }
    props.onScreenShareChange?.(false);
  }

  async function loadUrl() {
    if (!videoRef.current || !url) return;
    // Leader loads and propagates
    const el = videoRef.current;
    el.src = url;
    await el.load();
    setStatus("loaded");
    // CoWatchSync will broadcast LOAD automatically when leader plays/pauses/seek,
    // but to make initial state explicit we trigger a minimal LOAD via native event:
    el.dispatchEvent(new Event("seeked"));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          aria-label="media-url"
          placeholder="输入媒体 URL（mp4/m3u8）"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border rounded px-2 py-1 w-[420px]"
        />
        <button onClick={loadUrl} className="bg-blue-600 text-white px-3 py-1 rounded">
          加载媒体
        </button>
        {screenPub ? (
          <button onClick={stopScreenshare} className="bg-gray-600 text-white px-3 py-1 rounded">
            停止屏幕共享
          </button>
        ) : (
          <button onClick={startScreenshare} className="bg-green-600 text-white px-3 py-1 rounded">
            开始屏幕共享
          </button>
        )}
      </div>

      <video
        id="cowatch-video"
        ref={videoRef}
        controls
        playsInline
        className="w-full max-w-[960px] bg-black rounded"
        onPlay={() => setStatus("playing")}
        onPause={() => setStatus("paused")}
      />

      <div className="text-sm text-gray-600">状态：{status}</div>
    </div>
  );
}
