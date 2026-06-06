const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Meetroom.jsx', 'utf8');

// 1. Remove onToggleMirror from VideoTile
code = code.replace(/onToggleMirror = null, /, '');

// 2. useWebRTC hook
code = code.replace(/function useWebRTC\(\{ roomId, user, micOn, camOn \}\) \{/, 'function useWebRTC({ roomId, user, micOn, camOn, onForceMute }) {');

code = code.replace(/if \(msg\.type === 'ice'\) \{\s*const pc = peersRef\.current\[msg\.from\];\s*if \(pc\) pc\.addIceCandidate\(msg\.candidate\)\.catch\(\(\) => \{\}\);\s*\}/, 
\      if (msg.type === 'ice') {
        const pc = peersRef.current[msg.from];
        if (pc) pc.addIceCandidate(msg.candidate).catch(() => {});
      }

      if (msg.type === 'force-mute') {
        if (msg.to === myId.current) {
          if (msg.muteCam && onForceMute) onForceMute('cam');
          if (msg.muteMic && onForceMute) onForceMute('mic');
        }
      }\);

code = code.replace(/return \{ localStream, remoteFeeds, error, replaceVideoTrack \};/, 'return { localStream, remoteFeeds, error, replaceVideoTrack, channelRef };');

// 3. Meetroom useWebRTC call
code = code.replace(/const \{ localStream, remoteFeeds, error, replaceVideoTrack \} = useWebRTC\(\{ roomId, user, micOn, camOn \}\);/, 
\  const { localStream, remoteFeeds, error, replaceVideoTrack, channelRef } = useWebRTC({ 
    roomId, user, micOn, camOn,
    onForceMute: useCallback((type) => {
      if (type === 'mic') setMicOn(false);
      if (type === 'cam') setCamOn(false);
    }, [])
  });\);

// 4. Remove states
code = code.replace(/const \[localMirrored, setLocalMirrored\] = useState\(true\);\s*/, '');
code = code.replace(/const \[isSwapped, setIsSwapped\] = useState\(false\);\s*/, '');

// 5. Remove onToggleMirror prop and mirrored={...} -> mirrored={f.isLocal} etc
code = code.replace(/mirrored=\{[^\}]+\}\s*onToggleMirror=\{[^\}]+\}/g, (match) => {
  if (match.includes('activeScreenShare')) return 'mirrored={activeScreenShare.isLocal}';
  if (match.includes('f.isLocal')) return 'mirrored={f.isLocal}';
  if (match.includes('activeFeed')) return 'mirrored={activeFeed.isLocal}';
  if (match.includes('floatingFeed')) return 'mirrored={floatingFeed.isLocal}';
  if (match.includes('localMirrored')) return 'mirrored={true}';
  return match;
});

// 6. Sidebar padding
code = code.replace(/const contentStyle = \{\s*flex: 1,\s*display: 'flex',\s*flexDirection: 'column',\s*background: 'rgba\\(0,0,0,0\\.2\\)',/, 
\    const contentStyle = {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(0,0,0,0.2)',
      paddingTop: showControls && !isFullscreen ? '64px' : '0px',
      transition: 'padding-top 0.3s ease',\);

// 7. Navbar absolute
code = code.replace(/<nav style=\{\{\s*position: isFullscreen \? 'absolute' : 'relative',/, 
\        <nav style={{
          position: 'absolute',\);

// 8. Top ID display removal
code = code.replace(/<div style=\{\{ display: 'flex', alignItems: 'center', gap: '8px' \}\}>\s*<div style=\{\{\s*padding: '4px 10px',\s*background: 'rgba\\(255,255,255,0\\.1\\)',\s*borderRadius: '6px',\s*fontSize: '13px',\s*fontWeight: 600,\s*letterSpacing: '1px',\s*color: 'rgba\\(255,255,255,0\\.9\\)',\s*userSelect: 'all',\s*\}\}>\s*ID: \{roomId\}\s*<\/div>\s*<\/div>/, '');

// 9. resetHideTimer
code = code.replace(/const resetHideTimer = useCallback\(\(\) => \{\s*setShowControls\(true\);\s*clearTimeout\(hideTimerRef\.current\);\s*if \(document\.fullscreenElement\) \{\s*hideTimerRef\.current = setTimeout\(\(\) => setShowControls\(false\), 5000\);\s*\}\s*\}, \[\]\);/g, 
\  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);\);

code = code.replace(/useEffect\(\(\) => \{\s*if \(!isFullscreen\) \{\s*clearTimeout\(hideTimerRef\.current\);\s*const t = setTimeout\(\(\) => setShowControls\(true\), 0\);\s*return \(\) => \{ clearTimeout\(t\); clearTimeout\(hideTimerRef\.current\); \};\s*\}\s*\/\/ isFullscreen = true: start hide timer via setTimeout to avoid sync setState in effect\s*const t = setTimeout\(\(\) => \{\s*setShowControls\(true\);\s*clearTimeout\(hideTimerRef\.current\);\s*hideTimerRef\.current = setTimeout\(\(\) => setShowControls\(false\), 5000\);\s*\}, 0\);\s*return \(\) => \{\s*clearTimeout\(t\);\s*clearTimeout\(hideTimerRef\.current\);\s*\};\s*\}, \[isFullscreen\]\);/g, 
\  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimerRef.current);
  }, [resetHideTimer]);\);

// 10. Hide nav based on showControls
code = code.replace(/position: 'absolute',\s*top: 0, left: 0, right: 0, zIndex: 50,/,
\position: 'absolute',
          top: 0, left: 0, right: 0, zIndex: 50,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',\);

// 11. Add force mute buttons in Members list
code = code.replace(/<div style=\{\{ display: 'flex', gap: '10px', alignItems: 'center' \}\}>\s*<span title=\{f\.camOff \? "Camera táº¯t" : "Camera báº­t"\} style=\{\{ opacity: f\.camOff \? 0\.35 : 1 \}\}>\s*<VideoSvg active=\{!f\.camOff\} size=\{15\} \/>\s*<\/span>\s*<span title=\{f\.isLocal \? \(micOn \? "Mic báº­t" : "Mic táº¯t"\) : \(f\.micMuted \? "Mic táº¯t" : "Mic báº­t"\)\} style=\{\{ opacity: \(f\.isLocal \? !micOn : f\.micMuted\) \? 0\.35 : 1 \}\}>\s*<MicSvg active=\{!\(f\.isLocal \? !micOn : f\.micMuted\)\} size=\{15\} \/>\s*<\/span>\s*<\/div>/g, 
\                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                              {!f.isLocal && getParticipantRole(allFeeds.find(x => x.isLocal)) === 'Trưởng phòng' && (
                                <>
                                  <button
                                    onClick={() => {
                                      // eslint-disable-next-line no-undef
                                      channelRef.current?.send({
                                        type: 'broadcast', event: 'signal',
                                        payload: { type: 'force-mute', to: f.id, room: roomId, muteCam: true }
                                      });
                                    }}
                                    title="Tắt camera người này"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: f.camOff ? 0.35 : 1 }}
                                  >
                                    <VideoSvg active={!f.camOff} size={15} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      // eslint-disable-next-line no-undef
                                      channelRef.current?.send({
                                        type: 'broadcast', event: 'signal',
                                        payload: { type: 'force-mute', to: f.id, room: roomId, muteMic: true }
                                      });
                                    }}
                                    title="Tắt mic người này"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: f.micMuted ? 0.35 : 1 }}
                                  >
                                    <MicSvg active={!f.micMuted} size={15} />
                                  </button>
                                </>
                              )}
                              {(f.isLocal || getParticipantRole(allFeeds.find(x => x.isLocal)) !== 'Trưởng phòng') && (
                                <>
                                  <span title={f.camOff ? "Camera tắt" : "Camera bật"} style={{ opacity: f.camOff ? 0.35 : 1 }}>
                                    <VideoSvg active={!f.camOff} size={15} />
                                  </span>
                                  <span title={f.isLocal ? (micOn ? "Mic bật" : "Mic tắt") : (f.micMuted ? "Mic tắt" : "Mic bật")} style={{ opacity: (f.isLocal ? !micOn : f.micMuted) ? 0.35 : 1 }}>
                                    <MicSvg active={!(f.isLocal ? !micOn : f.micMuted)} size={15} />
                                  </span>
                                </>
                              )}
                            </div>\);

fs.writeFileSync('frontend/src/pages/Meetroom.jsx', code, 'utf8');
