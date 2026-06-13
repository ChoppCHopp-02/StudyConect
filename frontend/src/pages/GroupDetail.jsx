import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import useGroupDetail from '@/hooks/useGroupDetail';
import AppLayout from '@/layouts/AppLayout';
import GroupDocuments from '@/components/groups/GroupDocuments';
import GroupSchedule from '@/components/groups/GroupSchedule';
import GroupDeadlines from '@/components/groups/GroupDeadlines';
import GroupChatPanel from '@/components/groups/GroupChatPanel';
import GroupMembers from '@/components/groups/GroupMembers';
import ConfirmModal from '@/components/ConfirmModal';
import { getJoinRequests, approveJoinRequest, rejectJoinRequest } from '@/services/groupService';

export default function GroupDetail() {
  const { id: groupId } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, addToast, removeToast } = useToast();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const h = useGroupDetail(groupId, user, addToast);

  // Join requests (nhóm riêng tư)
  const [joinRequests, setJoinRequests] = useState([]);
  const [approvingIds, setApprovingIds] = useState({});
  const [rejectingIds, setRejectingIds] = useState({});

  const loadJoinRequests = async () => {
    if (!h.group?.isPrivate || String(user?.id) !== String(h.group?.creatorId)) return;
    const list = await getJoinRequests(groupId).catch(() => []);
    setJoinRequests(list);
  };

  const handleApproveJoin = async (req) => {
    setApprovingIds(p => ({ ...p, [req.id]: true }));
    try {
      await approveJoinRequest(req.id, groupId, req.userId);
      addToast(`Đã duyệt ${req.fullName} vào nhóm!`, 'success');
      setJoinRequests(p => p.filter(r => r.id !== req.id));
      h.fetchGroup && h.fetchGroup();
    } catch (err) { addToast(err.message, 'error'); }
    finally { setApprovingIds(p => ({ ...p, [req.id]: false })); }
  };

  const handleRejectJoin = async (req) => {
    setRejectingIds(p => ({ ...p, [req.id]: true }));
    try {
      await rejectJoinRequest(req.id);
      addToast(`Đã từ chối yêu cầu của ${req.fullName}.`, 'success');
      setJoinRequests(p => p.filter(r => r.id !== req.id));
    } catch (err) { addToast(err.message, 'error'); }
    finally { setRejectingIds(p => ({ ...p, [req.id]: false })); }
  };

  // Auto-switch tab from URL query params (hook also handles this, belt-and-suspenders)
  useEffect(() => {
    if (h.loading || !h.group) return;
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'schedule' || tab === 'deadlines') {
      h.setActiveTab(tab);
    }
  }, [h.group, h.loading, location.search]); // eslint-disable-line react-hooks/exhaustive-deps

      // Load join requests khi vào tab members 
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (h.activeTab === 'members' && h.group) loadJoinRequests();
  }, [h.activeTab, h.group]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to target list when activeTab changes
  useEffect(() => {
    if (h.loading || !h.group) return;
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if ((tab === 'schedule' || tab === 'deadlines') && h.activeTab === tab) {
      const timer = setTimeout(() => {
        const targetId = tab === 'schedule' ? 'group-schedule-list' : 'group-deadline-list';
        const element = document.getElementById(targetId);
        if (element) {
          // Find the scrollable container parent with overflowY: auto or scroll
          let scrollParent = element.parentElement;
          while (scrollParent && scrollParent !== document.body) {
            const overflowY = window.getComputedStyle(scrollParent).overflowY;
            if (overflowY === 'auto' || overflowY === 'scroll') {
              break;
            }
            scrollParent = scrollParent.parentElement;
          }
          if (scrollParent) {
            const parentRect = scrollParent.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const relativeTop = elementRect.top - parentRect.top + scrollParent.scrollTop;
            const yOffset = -20; // 20px padding from the top of the container
            scrollParent.scrollTo({
              top: relativeTop + yOffset,
              behavior: 'smooth'
            });
          } else {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 250); // 250ms delay to let React render the newly switched tab
      return () => clearTimeout(timer);
    }
  }, [h.activeTab, h.loading, h.group, location.search]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (h.loading) {
    return (
      <AppLayout user={user} onLogout={handleLogout} toasts={toasts} removeToast={removeToast} hideSidebar={true}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', flexDirection: 'column', gap: '16px' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-muted)' }}>Đang tải thông tin nhóm...</p>
        </div>
      </AppLayout>
    );
  }

  if (!h.group) return null;

  // Urgent deadline count for tab badge
  const isLeaderOrDeputy = String(user.id) === String(h.group.creatorId) || String(user.id) === String(h.group.deputyId);
  const urgentCount = h.deadlines.filter((d) => {
    if (d.completed) return false;
    if (isLeaderOrDeputy) return true;
    if (!d.assigneeId || d.assigneeId === 'all') return true;
    return String(d.assigneeId) === String(user.id);
  }).length;

  return (
    <AppLayout user={user} onLogout={handleLogout} toasts={toasts} removeToast={removeToast} hideSidebar={true}>
      <div className="group-detail-container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 48px' }}>

        {/* ── Group Header Card ── */}
        <div className="group-header-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: '28px', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
          <div className="group-header-content" style={{ padding: '28px 32px' }}>
            {/* Role pills */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: '6px', background: 'rgba(108,99,255,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(108,99,255,0.25)' }}>
                {h.group.subject}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '4px 12px', borderRadius: '6px', background: h.group.meetingMode === 'offline' ? 'rgba(16,185,129,0.1)' : 'rgba(99,179,237,0.1)', color: h.group.meetingMode === 'offline' ? '#10b981' : '#63b3ed', border: h.group.meetingMode === 'offline' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(99,179,237,0.3)' }}>
                {h.group.meetingMode === 'offline' ? 'Offline' : 'Online'}
              </span>
              {h.group.creatorId === user?.id && <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '4px 12px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>Trưởng nhóm</span>}
              {h.group.deputyId === user?.id && <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '4px 12px', borderRadius: '6px', background: 'rgba(108,99,255,0.1)', color: 'var(--primary-light)', border: '1px solid rgba(108,99,255,0.25)' }}>Phó nhóm</span>}
              {h.group.creatorId !== user?.id && h.group.deputyId !== user?.id && <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', padding: '4px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Thành viên</span>}
            </div>

            {/* Group name + member count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '24px', flexWrap: 'wrap' }}>
              <div>
                <h1 className="group-header-title" style={{ fontSize: '30px', fontWeight: 800, margin: '0 0 8px 0', color: 'var(--text-primary)', lineHeight: 1.2 }}>{h.group.name}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, maxWidth: '640px', lineHeight: 1.6 }}>{h.group.description || 'Chưa có mô tả cho nhóm này.'}</p>
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(62,207,207,0.06)', border: '1px solid rgba(62,207,207,0.2)', borderRadius: '999px', alignSelf: 'flex-start' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--secondary)' }}>{h.group.members.length}/{h.group.maxMembers || 10}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>thành viên</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div id="group-detail-tabs" className="profile-tabs" style={{ marginBottom: '32px' }}>
          {[
            { key: 'documents', label: isMobile ? '📁 Tài liệu' : '📁 Tài liệu học tập' },
            { key: 'schedule',  label: isMobile ? '📅 Lịch học' : '📅 Lịch học nhóm' },
            { key: 'deadlines', label: isMobile ? '⏰ Deadline' : '⏰ Deadline & Công việc', badge: urgentCount },
            { key: 'chat',      label: isMobile ? '💬 Chat' : '💬 Trò chuyện nhóm', badge: h.unreadChatCount },
            { key: 'members',   label: isMobile ? '👥 TViên' : '👥 Thành viên' },
          ].map(({ key, label, badge }) => (
            <button
              key={key}
              className={`profile-tab ${h.activeTab === key ? 'active' : ''}`}
              onClick={() => {
                h.setActiveTab(key);
              }}
              style={{ whiteSpace: 'nowrap', position: 'relative' }}
            >
              {label}
              {badge > 0 && (
                <span
                  style={isMobile ? {
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 800,
                    borderRadius: '6px',
                    padding: '1px 5px',
                    marginLeft: '5px',
                    lineHeight: 1,
                    verticalAlign: 'middle'
                  } : {
                    position: 'absolute',
                    top: '-4px',
                    right: '6px',
                    transform: 'translate(50%, -50%)',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 800,
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                    lineHeight: 1,
                    zIndex: 2,
                    boxSizing: 'border-box'
                  }}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Tab Panels ── */}
        {h.activeTab === 'documents' && (
          <GroupDocuments
            groupId={groupId} group={h.group} user={user}
            files={h.files}
            selectedFile={h.selectedFile} setSelectedFile={h.setSelectedFile}
            customFileName={h.customFileName} setCustomFileName={h.setCustomFileName}
            isUploadingFile={h.isUploadingFile}
            handleFileUpload={h.handleFileUpload}
            handleFileDelete={h.handleFileDelete}
            addToast={addToast}
          />
        )}

        {h.activeTab === 'schedule' && (
          <GroupSchedule
            groupId={groupId} group={h.group} user={user}
            schedules={h.schedules}
            newScheduleTopic={h.newScheduleTopic} setNewScheduleTopic={h.setNewScheduleTopic}
            newScheduleDateTime={h.newScheduleDateTime} setNewScheduleDateTime={h.setNewScheduleDateTime}
            newScheduleLocation={h.newScheduleLocation} setNewScheduleLocation={h.setNewScheduleLocation}
            newScheduleDesc={h.newScheduleDesc} setNewScheduleDesc={h.setNewScheduleDesc}
            isSubmittingSchedule={h.isSubmittingSchedule}
            editingSchedule={h.editingSchedule} setEditingSchedule={h.setEditingSchedule}
            editScheduleTopic={h.editScheduleTopic} setEditScheduleTopic={h.setEditScheduleTopic}
            editScheduleDateTime={h.editScheduleDateTime} setEditScheduleDateTime={h.setEditScheduleDateTime}
            editScheduleLocation={h.editScheduleLocation} setEditScheduleLocation={h.setEditScheduleLocation}
            editScheduleDesc={h.editScheduleDesc} setEditScheduleDesc={h.setEditScheduleDesc}
            overrideLocation={h.overrideLocation} setOverrideLocation={h.setOverrideLocation}
            openEditSchedule={h.openEditSchedule}
            handleUpdateSchedule={h.handleUpdateSchedule}
            handleScheduleSubmit={h.handleScheduleSubmit}
            handleScheduleDelete={h.handleScheduleDelete}
            addToast={addToast}
          />
        )}

        {h.activeTab === 'deadlines' && (
          <GroupDeadlines
            groupId={groupId} group={h.group} user={user}
            deadlines={h.deadlines}
            newDeadlineTitle={h.newDeadlineTitle} setNewDeadlineTitle={h.setNewDeadlineTitle}
            newDeadlineDueDate={h.newDeadlineDueDate} setNewDeadlineDueDate={h.setNewDeadlineDueDate}
            newDeadlineDesc={h.newDeadlineDesc} setNewDeadlineDesc={h.setNewDeadlineDesc}
            newDeadlineAssignee={h.newDeadlineAssignee} setNewDeadlineAssignee={h.setNewDeadlineAssignee}
            isSubmittingDeadline={h.isSubmittingDeadline}
            editingDeadline={h.editingDeadline} setEditingDeadline={h.setEditingDeadline}
            editDeadlineTitle={h.editDeadlineTitle} setEditDeadlineTitle={h.setEditDeadlineTitle}
            editDeadlineDueDate={h.editDeadlineDueDate} setEditDeadlineDueDate={h.setEditDeadlineDueDate}
            editDeadlineDesc={h.editDeadlineDesc} setEditDeadlineDesc={h.setEditDeadlineDesc}
            editDeadlineAssignee={h.editDeadlineAssignee} setEditDeadlineAssignee={h.setEditDeadlineAssignee}
            openEditDeadline={h.openEditDeadline}
            handleUpdateDeadline={h.handleUpdateDeadline}
            handleDeadlineSubmit={h.handleDeadlineSubmit}
            handleDeadlineDelete={h.handleDeadlineDelete}
            submissions={h.submissions}
            showSubmitModal={h.showSubmitModal} setShowSubmitModal={h.setShowSubmitModal}
            submitNote={h.submitNote} setSubmitNote={h.setSubmitNote}
            submitFile={h.submitFile} setSubmitFile={h.setSubmitFile}
            isSubmitting={h.isSubmitting}
            showSubmissionsFor={h.showSubmissionsFor} setShowSubmissionsFor={h.setShowSubmissionsFor}
            handleSubmitAssignment={h.handleSubmitAssignment}
            handleRemindDeadline={h.handleRemindDeadline}
            remindingIds={h.remindingIds}
            membersDetails={h.membersDetails}
          />
        )}

        {h.activeTab === 'chat' && (
          <GroupChatPanel
            user={user}
            chatMessages={h.chatMessages}
            chatInput={h.chatInput} setChatInput={h.setChatInput}
            chatAttachedFile={h.chatAttachedFile} setChatAttachedFile={h.setChatAttachedFile}
            isSendingChatMessage={h.isSendingChatMessage}
            contextMenu={h.contextMenu} setContextMenu={h.setContextMenu}
            replyTo={h.replyTo} setReplyTo={h.setReplyTo}
            msgReactions={h.msgReactions}
            handleMsgReact={h.handleMsgReact}
            handleMsgDelete={h.handleMsgDelete}
            handleMsgPin={h.handleMsgPin}
            handleSendChatMessage={h.handleSendChatMessage}
            group={h.group}
            membersDetails={h.membersDetails}
          />
        )}

        {h.activeTab === 'members' && (
          <GroupMembers
            groupId={groupId} group={h.group} user={user}
            isAssigningDeputy={h.isAssigningDeputy}
            friendRequestingIds={h.friendRequestingIds}
            kickingIds={h.kickingIds}
            handleAssignDeputy={h.handleAssignDeputy}
            handleRemoveDeputy={h.handleRemoveDeputy}
            handleSendFriendRequest={h.handleSendFriendRequest}
            handleKickMember={h.handleKickMember}
            membersDetails={h.membersDetails}
            friendships={h.friendships}
            joinRequests={joinRequests}
            approvingIds={approvingIds}
            rejectingIds={rejectingIds}
            handleApproveJoin={handleApproveJoin}
            handleRejectJoin={handleRejectJoin}
            onlineUserIds={h.onlineUserIds}
          />
        )}

      </div>

      <ConfirmModal
        isOpen={!!h.confirmConfig}
        title={h.confirmConfig?.title}
        message={h.confirmConfig?.message}
        confirmText={h.confirmConfig?.confirmText}
        cancelText={h.confirmConfig?.cancelText}
        variant={h.confirmConfig?.variant}
        onConfirm={h.confirmConfig?.onConfirm}
        onCancel={h.confirmConfig?.onCancel || (() => h.setConfirmConfig(null))}
      />
    </AppLayout>
  );
}