import { useRef, useEffect, useState } from 'react';
import MessageMenu from './MessageMenu';

const EMOJI_LIST = [
  '😊','😂','🥰','😎','🤔','😅','🙏','👍','❤️','🔥','✨','🎉',
  '😢','😮','🤣','💪','👏','🥳','😤','🫠','😴','🤯','😇','🤩',
  '😏','😬','🫡','🥺','😭','🤧','😷','🤓','👀','💯','🎯','📚',
  '✅','⚡','🚀','💡',
];

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const downloadBaseFile = async (dataUrl, fileName) => {
  try {
    if (!dataUrl) return;
    if (!dataUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    
    // Use fetch to safely parse base64 data URLs into a Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Delay revocation so the browser has time to start the download
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    console.error('Lỗi download file:', err);
    window.open(dataUrl, '_blank');
  }
};

export default function GroupChatPanel({
  user,
  chatMessages,
  chatInput,
  setChatInput,
  chatAttachedFile,
  setChatAttachedFile,
  isSendingChatMessage,
  contextMenu,
  setContextMenu,
  replyTo,
  setReplyTo,
  msgReactions,
  handleMsgReact,
  handleMsgDelete,
  handleMsgPin,
  handleSendChatMessage,
  group,
  membersDetails = [],
}) {
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // @ mention state
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);

  const filteredMentions = showMentionList
    ? membersDetails.filter(
        (m) =>
          String(m.id) !== String(user?.id) &&
          m.fullName?.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  const scrollContainerRef = useRef(null);
  const isFirstRender = useRef(true);
  const prevLastMsgIdRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const container = chatContainerRef.current; // Notice: previously used scrollContainerRef which was undefined, use chatContainerRef
    const lastMsg = chatMessages[chatMessages.length - 1];

    if (!lastMsg) return;

    if (isFirstRender.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      isFirstRender.current = false;
      prevLastMsgIdRef.current = lastMsg.id;
      return;
    }

    if (prevLastMsgIdRef.current !== lastMsg.id) {
      prevLastMsgIdRef.current = lastMsg.id;
      const isMyLastMsg = String(lastMsg.userId) === String(user?.id);

      if (isMyLastMsg) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
        if (isNearBottom) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [chatMessages, user?.id]);

  const openContextMenu = (e, msg) => {
    e.preventDefault();
    const container = chatContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      msg,
    });
  };

  const handleChatFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setChatAttachedFile(file);
  };

  const removeChatAttachment = () => {
    setChatAttachedFile(null);
    const el = document.getElementById('chat-file-input');
    if (el) el.value = '';
  };

  const handleChatSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowMentionList(false);
    handleSendChatMessage(e);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setChatInput(val);

    // Detect @ trigger
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\S*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStartIdx(cursor - atMatch[0].length);
      setShowMentionList(true);
    } else {
      setShowMentionList(false);
      setMentionQuery('');
    }
  };

  const insertMention = (member) => {
    const before = chatInput.slice(0, mentionStartIdx);
    const after = chatInput.slice(mentionStartIdx + 1 + mentionQuery.length);
    const newVal = `${before}@${member.fullName} ${after}`;
    setChatInput(newVal);
    setShowMentionList(false);
    setMentionQuery('');
  };

  return (
    <div
      ref={chatContainerRef}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        height: '600px',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.01)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Phòng trò chuyện nhóm
          </h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }} />
        </div>
        <span
          style={{
            fontSize: '12px',
            background: 'rgba(74,222,128,0.15)',
            color: '#4ade80',
            padding: '4px 10px',
            borderRadius: '12px',
            fontWeight: 600,
          }}
        >
          ● Trực tuyến
        </span>
      </div>

      <style>{`
        .chat-scroll::-webkit-scrollbar { display: none; }
        .chat-scroll { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Pinned Messages Banner */}
      {(() => {
        const pinnedList = chatMessages.filter(m => m.isPinned);
        if (pinnedList.length === 0) return null;
        const lastPinned = pinnedList[pinnedList.length - 1];
        return (
          <div
            style={{
              background: 'rgba(108, 99, 255, 0.08)',
              borderBottom: '1px solid var(--border)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              zIndex: 5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
              <span style={{ fontSize: '15px', flexShrink: 0 }}>📌</span>
              <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--primary-light)' }}>Tin nhắn đã ghim:</strong>{' '}
                {lastPinned.content || (lastPinned.fileAttachment ? `📎 [Tệp] ${lastPinned.fileAttachment.fileName}` : 'Tin nhắn trống')}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(`msg-${lastPinned.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const bubble = el.querySelector('.chat-bubble-container');
                    if (bubble) {
                      const origBg = bubble.style.background;
                      const origBorder = bubble.style.border;
                      bubble.style.background = 'rgba(108, 99, 255, 0.25)';
                      bubble.style.border = '1px solid var(--primary)';
                      setTimeout(() => {
                        bubble.style.background = origBg;
                        bubble.style.border = origBorder;
                      }, 2000);
                    }
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-light)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                Xem
              </button>
              {(String(user.id) === String(group?.creatorId) ||
                String(user.id) === String(group?.deputyId) ||
                lastPinned.userId === user.id) && (
                <button
                  type="button"
                  onClick={() => handleMsgPin(lastPinned.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    padding: '0 4px',
                  }}
                  title="Bỏ ghim"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="chat-scroll"
        style={{
          flex: 1,
          padding: '20px 24px',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          background: 'rgba(0,0,0,0.05)',
        }}
        onClick={() => setContextMenu(null)}
      >
        {chatMessages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <p style={{ margin: 0, fontSize: '15px' }}>Chưa có tin nhắn</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.userId === user.id;
            const senderInitials =
              msg.userFullName
                ?.split(' ')
                .map((w) => w[0])
                .slice(-2)
                .join('')
                .toUpperCase() || '?';
            const reactions = msgReactions[msg.id] || [];
            const reactionCounts = reactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {});

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  flexDirection: isMe ? 'row-reverse' : 'row',
                  maxWidth: '78%',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  transition: 'background 0.5s ease',
                  padding: '4px 8px',
                  borderRadius: '12px',
                }}
              >
                {/* Avatar */}
                {msg.userAvatar ? (
                  <img
                    src={msg.userAvatar}
                    alt="avatar"
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--border)',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: isMe ? 'var(--primary)' : 'var(--border)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {senderInitials}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    gap: '3px',
                  }}
                >
                  {/* Name + time */}
                  <div style={{ display: 'flex', gap: '7px', alignItems: 'center', fontSize: '11px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {isMe ? 'Bạn' : msg.userFullName}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.isPinned && (
                      <span title="Tin nhắn đã ghim" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: 'var(--secondary)', fontWeight: 600 }}>
                        📌 Đã ghim
                      </span>
                    )}
                  </div>

                  {/* Bubble */}
                  <div
                    className="chat-bubble-container"
                    onContextMenu={(e) => openContextMenu(e, msg)}
                    onDoubleClick={(e) => openContextMenu(e, msg)}
                    style={{
                      background: isMe ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      border: isMe ? 'none' : '1px solid var(--border)',
                      color: isMe ? '#fff' : 'var(--text-primary)',
                      padding: '10px 14px',
                      borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      cursor: 'context-menu',
                      transition: 'background 0.3s ease, border-color 0.3s ease',
                    }}
                  >
                    {/* Reply preview */}
                    {msg.replyTo && (
                      <div
                        style={{
                          background: isMe ? 'rgba(0,0,0,0.2)' : 'rgba(108,99,255,0.15)',
                          borderLeft: '3px solid rgba(108,99,255,0.6)',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          marginBottom: '8px',
                          fontSize: '12px',
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            color: isMe ? 'rgba(255,255,255,0.8)' : 'var(--primary-light)',
                            marginBottom: '2px',
                          }}
                        >
                          ↩️ {msg.replyTo.userFullName}
                        </div>
                        <div
                          style={{
                            color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {msg.replyTo.content}
                        </div>
                      </div>
                    )}

                    {msg.content && <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>}

                    {/* File attachment */}
                    {msg.fileAttachment &&
                      (() => {
                        const fileName = msg.fileAttachment.fileName || msg.fileAttachment.name || 'Tài liệu';
                        const fileType = msg.fileAttachment.fileType || msg.fileAttachment.type || '';
                        const fileData = msg.fileAttachment.fileData || msg.fileAttachment.data || '';
                        const fileSize = msg.fileAttachment.fileSize || '';
                        const isImage = fileType?.startsWith('image/');

                        return isImage ? (
                          <div style={{ marginTop: msg.content ? '8px' : 0 }}>
                            <img
                              src={fileData}
                              alt={fileName}
                              style={{
                                maxWidth: '260px',
                                maxHeight: '200px',
                                borderRadius: '10px',
                                display: 'block',
                                objectFit: 'cover',
                                cursor: 'pointer',
                              }}
                              onClick={() => downloadBaseFile(fileData, fileName)}
                            />
                            <button
                              type="button"
                              onClick={() => downloadBaseFile(fileData, fileName)}
                              style={{
                                display: 'inline-block',
                                marginTop: '5px',
                                fontSize: '11px',
                                color: isMe ? 'rgba(255,255,255,0.75)' : 'var(--text-muted)',
                                textDecoration: 'underline',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                              }}
                            >
                              {fileName}
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              marginTop: msg.content ? '10px' : 0,
                              background: isMe ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.03)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '8px',
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              minWidth: '200px',
                            }}
                          >
                            <span style={{ fontSize: '22px' }}>📎</span>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {fileName}
                              </div>
                              <div style={{ fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--text-muted)' }}>
                                {fileSize}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadBaseFile(fileData, fileName)}
                              style={{
                                background: isMe ? '#fff' : 'var(--primary)',
                                color: isMe ? 'var(--primary)' : '#fff',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              Tải về
                            </button>
                          </div>
                        );
                      })()}
                  </div>

                  {/* Reaction counts */}
                  {Object.keys(reactionCounts).length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                      {Object.entries(reactionCounts).map(([emoji, count]) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleMsgReact(msg.id, emoji)}
                          style={{
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '2px 8px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                            transition: '0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.15)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                        >
                          <span>{emoji}</span>
                          {count > 1 && <span style={{ fontSize: '11px', fontWeight: 600 }}>{count}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <MessageMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isMine={String(contextMenu.msg.userId) === String(user.id)}
          isPinned={contextMenu.msg.isPinned}
          canPin={
            String(user.id) === String(group?.creatorId) ||
            String(user.id) === String(group?.deputyId) ||
            String(contextMenu.msg.userId) === String(user.id)
          }
          onDelete={() => handleMsgDelete(contextMenu.msg.id)}
          onReact={(em) => handleMsgReact(contextMenu.msg.id, em)}
          onPin={() => handleMsgPin(contextMenu.msg.id)}
          onReply={() =>
            setReplyTo({
              id: contextMenu.msg.id,
              userFullName: contextMenu.msg.userFullName,
              content:
                contextMenu.msg.content ||
                (contextMenu.msg.fileAttachment ? contextMenu.msg.fileAttachment.fileName : ''),
            })
          }
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Input area */}
      <form
        onSubmit={handleChatSubmit}
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(255,255,255,0.01)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
        }}
      >
        {/* Reply preview */}
        {replyTo && (
          <div
            style={{
              background: 'rgba(108,99,255,0.1)',
              border: '1.5px dashed rgba(108,99,255,0.4)',
              padding: '8px 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-light)', marginBottom: '2px' }}>
                ↩️ Trả lời {replyTo.userFullName}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {replyTo.content}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '16px', fontWeight: 700, flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* File attachment preview */}
        {chatAttachedFile && (
          <div
            style={{
              background: 'rgba(108,99,255,0.1)',
              border: '1.5px dashed var(--primary-light)',
              padding: '8px 14px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>📎</span>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{chatAttachedFile.name}</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  ({formatBytes(chatAttachedFile.size)})
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={removeChatAttachment}
              style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '6px 8px 6px 12px',
          }}
        >
          {/* Emoji picker */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => {
                const picker = document.getElementById('emoji-picker-popup');
                if (picker) picker.style.display = picker.style.display === 'none' ? 'flex' : 'none';
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '4px 6px',
                borderRadius: '8px',
                lineHeight: 1,
                color: 'var(--text-muted)',
                transition: '0.15s',
              }}
              title="Chèn emoji"
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              😊
            </button>
            <div
              id="emoji-picker-popup"
              style={{
                display: 'none',
                position: 'absolute',
                bottom: '44px',
                left: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                padding: '10px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                zIndex: 999,
                flexWrap: 'wrap',
                gap: '4px',
                width: '280px',
                maxHeight: '200px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    setChatInput((v) => v + emoji);
                    document.getElementById('emoji-picker-popup').style.display = 'none';
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '22px',
                    padding: '4px',
                    borderRadius: '6px',
                    lineHeight: 1,
                    transition: '0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* File attach */}
          <label
            htmlFor="chat-file-input"
            style={{
              flexShrink: 0,
              cursor: 'pointer',
              fontSize: '18px',
              padding: '4px 6px',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              lineHeight: 1,
              transition: '0.15s',
            }}
            title="Đính kèm file"
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            📎
            <input type="file" id="chat-file-input" onChange={handleChatFileChange} style={{ display: 'none' }} />
          </label>

          {/* @ Mention dropdown */}
          {showMentionList && filteredMentions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: '64px',
                left: '12px',
                right: '12px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '14px',
                boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
                zIndex: 200,
                overflow: 'hidden',
                maxHeight: '220px',
                overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              <div style={{ padding: '6px 14px 4px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                THÀNH VIÊN
              </div>
              {filteredMentions.map((m) => {
                const initials = m.fullName?.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => insertMention(m)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(108,99,255,0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                  >
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.fullName} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                        {initials}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{m.fullName}</div>
                      {m.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.email}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Text input */}
          <input
            type="text"
            placeholder="Nhập tin nhắn... (@ để tag thành viên)"
            value={chatInput}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowMentionList(false); return; }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (showMentionList && filteredMentions.length > 0) {
                  insertMention(filteredMentions[0]);
                } else {
                  handleChatSubmit(e);
                }
              }
            }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              padding: '6px 4px',
              minWidth: 0,
            }}
            disabled={isSendingChatMessage}
            onClick={() => {
              const picker = document.getElementById('emoji-picker-popup');
              if (picker) picker.style.display = 'none';
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={isSendingChatMessage || (!chatInput.trim() && !chatAttachedFile)}
            style={{
              flexShrink: 0,
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: 'none',
              background:
                chatInput.trim() || chatAttachedFile
                  ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
                  : 'rgba(255,255,255,0.06)',
              color: chatInput.trim() || chatAttachedFile ? 'white' : 'var(--text-muted)',
              cursor: chatInput.trim() || chatAttachedFile ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: '0.2s',
              boxShadow: chatInput.trim() || chatAttachedFile ? '0 4px 12px rgba(108,99,255,0.35)' : 'none',
            }}
            title="Gửi"
          >
            {isSendingChatMessage ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ animation: 'spin 1s linear infinite' }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
