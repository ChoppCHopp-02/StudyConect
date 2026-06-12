/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { formatBytes } from '@/utils';
import { getGroupById, assignDeputy, removeDeputy, kickMember } from '@/services/groupService';
import { sendFriendRequest } from '@/services/friendService';
import { supabase } from '@/config/supabaseClient';
import {
  getFiles,
  uploadFile,
  deleteFile,
  getSchedules,
  createSchedule,
  deleteSchedule,
  updateSchedule,
  getDeadlines,
  createDeadline,
  toggleDeadline,
  deleteDeadline,
  updateDeadline,
  getChatMessages,
  sendChatMessage,
  deleteChatMessage,
  togglePinChatMessage
} from '@/services/interactionService';

const getProcessedDeadlines = (deadList) => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  return deadList.map(d => {
    const due = new Date(d.dueDate).getTime();
    return {
      ...d,
      dueSoon: !d.completed && due > now && (due - now) <= oneDayMs,
      overdue: !d.completed && due < now
    };
  });
};

export default function useGroupDetail(groupId, user, addToast) {
  const navigate = useNavigate();
  const location = useLocation();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('documents');

  // Members management state
  const [isAssigningDeputy, setIsAssigningDeputy] = useState(false);
  const [friendRequestingIds, setFriendRequestingIds] = useState({});
  const [kickingIds, setKickingIds] = useState({});
  const [membersDetails, setMembersDetails] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  // Documents state
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [uploadSubject, setUploadSubject] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  // Schedule state
  const [schedules, setSchedules] = useState([]);
  const [newScheduleTopic, setNewScheduleTopic] = useState('');
  const [newScheduleDateTime, setNewScheduleDateTime] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [newScheduleLocation, setNewScheduleLocation] = useState('');
  const [newScheduleDesc, setNewScheduleDesc] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editScheduleTopic, setEditScheduleTopic] = useState('');
  const [editScheduleDateTime, setEditScheduleDateTime] = useState('');
  const [editScheduleLocation, setEditScheduleLocation] = useState('');
  const [editScheduleDesc, setEditScheduleDesc] = useState('');
  const [overrideLocation, setOverrideLocation] = useState(false);

  // Deadline state
  const [deadlines, setDeadlines] = useState([]);
  const [newDeadlineTitle, setNewDeadlineTitle] = useState('');
  const [newDeadlineDueDate, setNewDeadlineDueDate] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [newDeadlineDesc, setNewDeadlineDesc] = useState('');
  const [newDeadlineAssignee, setNewDeadlineAssignee] = useState('all');
  const [isSubmittingDeadline, setIsSubmittingDeadline] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(null);
  const [editDeadlineTitle, setEditDeadlineTitle] = useState('');
  const [editDeadlineDueDate, setEditDeadlineDueDate] = useState('');
  const [editDeadlineDesc, setEditDeadlineDesc] = useState('');
  const [editDeadlineAssignee, setEditDeadlineAssignee] = useState('all');
  const [urgentDeadlinesCount, setUrgentDeadlinesCount] = useState(0);

  // Submission state
  const [submissions, setSubmissions] = useState({});
  const [showSubmitModal, setShowSubmitModal] = useState(null);
  const [submitNote, setSubmitNote] = useState('');
  const [submitFile, setSubmitFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmissionsFor, setShowSubmissionsFor] = useState(null);

  // Reminders state
  const [remindingIds, setRemindingIds] = useState({});

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatAttachedFile, setChatAttachedFile] = useState(null);
  const [isSendingChatMessage, setIsSendingChatMessage] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [msgReactions, setMsgReactions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.reactions(groupId)) || '{}');
    } catch {
      return {};
    }
  });
  const [chatLastSeenTime, setChatLastSeenTime] = useState(() => {
    return localStorage.getItem(`studyconect_group_chat_last_seen_${groupId}`) || new Date(0).toISOString();
  });
  const [confirmConfig, setConfirmConfig] = useState(null);

  const fetchGroupSchedules = useCallback(async () => {
    if (!groupId) return;
    try {
      const schedulesData = await getSchedules(groupId);
      setSchedules(schedulesData);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách lịch học', 'error');
    }
  }, [groupId, addToast]);

  const fetchGroupDeadlines = useCallback(async () => {
    if (!groupId) return;
    try {
      const deadlinesData = await getDeadlines(groupId);
      const processed = getProcessedDeadlines(deadlinesData);
      setDeadlines(processed);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách deadline', 'error');
    }
  }, [groupId, addToast]);

  const SUBMISSIONS_KEY = STORAGE_KEYS.submissions(groupId);

  const loadSubmissions = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '{}');
    } catch {
      return {};
    }
  }, [SUBMISSIONS_KEY]);

  const saveSubmissions = useCallback((data) => {
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(data));
  }, [SUBMISSIONS_KEY]);

  const fetchChatMessages = useCallback(async () => {
    if (!groupId) return;
    try {
      const messages = await getChatMessages(groupId);
      setChatMessages(messages);
    } catch (err) {
      addToast(err.message || 'Lỗi tải tin nhắn', 'error');
    }
  }, [groupId, addToast]);

  const fetchGroupFiles = useCallback(async () => {
    if (!groupId) return;
    try {
      const filesData = await getFiles(groupId);
      setFiles(filesData);
    } catch (err) {
      addToast(err.message || 'Lỗi tải danh sách tài liệu', 'error');
    }
  }, [groupId, addToast]);

  const fetchGroupMembersDetails = useCallback(async (membersList) => {
    if (!membersList || membersList.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, avatar')
        .in('id', membersList.map(id => parseInt(id, 10)));
      
      if (!error && data) {
        setMembersDetails(data.map(u => ({
          id: u.id.toString(),
          fullName: u.full_name,
          email: u.email,
          avatar: u.avatar
        })));
      }
    } catch (err) {
      console.warn('Lỗi tải thông tin thành viên:', err);
    }
  }, []);

  const fetchGroupFriendships = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`from_user_id.eq.${parseInt(user.id, 10)},to_user_id.eq.${parseInt(user.id, 10)}`);
      
      if (!error && data) {
        setFriendships(data);
      }
    } catch (err) {
      console.warn('Lỗi tải quan hệ bạn bè:', err);
    }
  }, [user]);

  const fetchGroupDetails = useCallback(async () => {
    try {
      setLoading(true);
      const groupData = await getGroupById(groupId);
      if (!groupData) {
        addToast('Không tìm thấy nhóm học này!', 'error');
        navigate('/groups');
        return;
      }
      if (!groupData.members.some(m => Number(m) === Number(user?.id))) {
        addToast('Bạn phải tham gia nhóm này để xem nội dung!', 'error');
        navigate('/groups');
        return;
      }
      setGroup(groupData);
      await fetchGroupMembersDetails(groupData.members);
      await fetchGroupFriendships();
      await fetchGroupDeadlines();
    } catch (err) {
      addToast(err.message || 'Lỗi tải thông tin nhóm', 'error');
      navigate('/groups');
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.id, navigate, addToast, fetchGroupDeadlines, fetchGroupMembersDetails, fetchGroupFriendships]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  // Subscribe to real-time presence channel
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id.toString(),
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.keys(state);
        setOnlineUserIds(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id.toString(),
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id]);

  // Load appropriate data when tab changes
  useEffect(() => {
    if (group) {
      if (activeTab === 'documents') {
        fetchGroupFiles();
      } else if (activeTab === 'schedule') {
        fetchGroupSchedules();
      } else if (activeTab === 'deadlines') {
        fetchGroupDeadlines();
      } else if (activeTab === 'chat') {
        fetchChatMessages();
      }
    }
  }, [group, activeTab, fetchGroupFiles, fetchGroupSchedules, fetchGroupDeadlines, fetchChatMessages]);

  // Chat messaging Realtime listener - ALWAYS active for unread count tracking!
  useEffect(() => {
    if (group && groupId) {
      // Initial fetch
      fetchChatMessages();

      // Listen for new messages in real-time
      const chatChannel = supabase
        .channel(`group-chat-${groupId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `group_id=eq.${groupId}`
          },
          () => {
            fetchChatMessages(); // Refetch messages in real-time!
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
      };
    }
  }, [group, groupId, fetchChatMessages]);

  // Sync last seen chat time when chat is active
  useEffect(() => {
    if (activeTab === 'chat' && groupId) {
      const nowStr = new Date().toISOString();
      setChatLastSeenTime(nowStr);
      localStorage.setItem(`studyconect_group_chat_last_seen_${groupId}`, nowStr);
    }
  }, [activeTab, groupId, chatMessages]);

  // Handle invite search params
  useEffect(() => {
    if (!group) return;
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'schedule') {
      setTimeout(() => setActiveTab('schedule'), 0);
    }
    if (params.get('tab') === 'deadlines') {
      setTimeout(() => setActiveTab('deadlines'), 0);
    }
  }, [group, location.search]);

  // Populate submissions on mount
  useEffect(() => {
    if (!groupId) return;
    setSubmissions(loadSubmissions());
  }, [groupId, loadSubmissions]);

  // Sync urgent deadline alarms
  useEffect(() => {
    let count = 0;
    if (group && deadlines.length > 0) {
      const isLeader = String(user?.id) === String(group.creatorId) || String(user?.id) === String(group.deputyId);
      count = deadlines.filter(d => {
        if (!d.dueSoon) return false;
        if (isLeader) return true;
        if (!d.assigneeId || d.assigneeId === 'all') return true;
        return String(d.assigneeId) === String(user?.id);
      }).length;
    }
    setUrgentDeadlinesCount(count);
  }, [deadlines, group, user?.id]);

  const handleAssignDeputy = async (targetUserId) => {
    try {
      setIsAssigningDeputy(true);
      const updatedGroup = await assignDeputy(groupId, user.id, targetUserId);
      setGroup(updatedGroup);
      await fetchGroupMembersDetails(updatedGroup.members);
      addToast('Đã phân quyền phó nhóm thành công!', 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi phân quyền phó nhóm', 'error');
    } finally {
      setIsAssigningDeputy(false);
    }
  };

  const handleRemoveDeputy = () => {
    setConfirmConfig({
      title: 'Thu hồi quyền Phó nhóm',
      message: 'Bạn có chắc chắn muốn thu hồi quyền phó nhóm không?',
      confirmText: 'Thu hồi',
      cancelText: 'Giữ lại',
      variant: 'warning',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          setIsAssigningDeputy(true);
          const updatedGroup = await removeDeputy(groupId, user.id);
          setGroup(updatedGroup);
          await fetchGroupMembersDetails(updatedGroup.members);
          addToast('Đã thu hồi quyền phó nhóm!', 'success');
        } catch (err) {
          addToast(err.message || 'Lỗi thu hồi quyền phó nhóm', 'error');
        } finally { setIsAssigningDeputy(false); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleSendFriendRequest = async (targetId) => {
    const tid = String(targetId);
    try {
      setFriendRequestingIds(prev => ({ ...prev, [tid]: true }));
      await sendFriendRequest(String(user.id), tid);
      addToast('Đã gửi lời mời kết bạn!', 'success');
      await fetchGroupFriendships();
    } catch (err) {
      addToast(err.message || 'Lỗi gửi lời mời kết bạn', 'error');
    } finally {
      setFriendRequestingIds(prev => ({ ...prev, [tid]: false }));
    }
  };

  const handleKickMember = (targetUserId) => {
    const tid = String(targetUserId);
    setConfirmConfig({
      title: 'Kick thành viên',
      message: 'Bạn có chắc muốn kick thành viên này ra khỏi nhóm?',
      confirmText: 'Kick ra khỏi nhóm',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try {
          setKickingIds(prev => ({ ...prev, [tid]: true }));
          const updated = await kickMember(groupId, user.id, tid);
          setGroup(updated);
          await fetchGroupMembersDetails(updated.members);
          addToast('Đã kick thành viên khỏi nhóm.', 'success');
        } catch (err) {
          addToast(err.message || 'Lỗi kick thành viên', 'error');
        } finally { setKickingIds(prev => ({ ...prev, [tid]: false })); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const openEditSchedule = (sched) => {
    setEditingSchedule(sched);
    setEditScheduleTopic(sched.topic);
    const dateObj = new Date(sched.dateTime);
    setEditScheduleDateTime(sched.dateTime ? new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setEditScheduleLocation(sched.location || '');
    setEditScheduleDesc(sched.description || '');
  };

  const handleUpdateSchedule = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editScheduleTopic.trim() || !editScheduleDateTime) {
      addToast('Vui lòng nhập chủ đề và thời gian.', 'error');
      return;
    }
    // Validate: schedule must be within 7 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    const [dateP, timeP] = editScheduleDateTime.split('T');
    const [y, m, d] = dateP.split('-');
    const [h, min] = timeP.split(':');
    const scheduleDateObj = new Date(y, m - 1, d, h, min);

    if (scheduleDateObj > maxDate) {
      addToast('Thời gian học không được vượt quá 7 ngày kể từ hôm nay!', 'error');
      return;
    }
    try {
      setIsSubmittingSchedule(true);
      await updateSchedule(editingSchedule.id, {
        topic: editScheduleTopic.trim(),
        dateTime: scheduleDateObj.toISOString(),
        location: editScheduleLocation.trim(),
        description: editScheduleDesc.trim(),
      });
      addToast('Cập nhật lịch học thành công!', 'success');
      setEditingSchedule(null);
      fetchGroupSchedules();
    } catch (err) {
      addToast(err.message || 'Lỗi cập nhật lịch học', 'error');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const openEditDeadline = (dl) => {
    setEditingDeadline(dl);
    setEditDeadlineTitle(dl.title);
    const dateObj = new Date(dl.dueDate);
    setEditDeadlineDueDate(dl.dueDate ? new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
    setEditDeadlineDesc(dl.description || '');
    setEditDeadlineAssignee(dl.assigneeId || 'all');
  };

  const handleUpdateDeadline = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editDeadlineTitle.trim() || !editDeadlineDueDate) {
      addToast('Vui lòng nhập tiêu đề và hạn chót.', 'error');
      return;
    }
    // Validate: deadline must be within 7 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    const [dateP, timeP] = editDeadlineDueDate.split('T');
    const [y, m, d] = dateP.split('-');
    const [h, min] = timeP.split(':');
    const deadlineDateObj = new Date(y, m - 1, d, h, min);

    if (deadlineDateObj > maxDate) {
      addToast('Hạn chót không được vượt quá 7 ngày kể từ hôm nay!', 'error');
      return;
    }
    try {
      setIsSubmittingDeadline(true);
      const assigneeMember = editDeadlineAssignee !== 'all' ? (() => {
        const u = membersDetails.find(u => String(u.id) === String(editDeadlineAssignee));
        return u ? u.fullName : null;
      })() : null;
      await updateDeadline(editingDeadline.id, {
        title: editDeadlineTitle.trim(),
        dueDate: deadlineDateObj.toISOString(),
        description: editDeadlineDesc.trim(),
        assigneeId: editDeadlineAssignee !== 'all' ? editDeadlineAssignee : null,
        assigneeName: assigneeMember,
      });
      addToast('Cập nhật deadline thành công!', 'success');
      setEditingDeadline(null);
      fetchGroupDeadlines();
    } catch (err) {
      addToast(err.message || 'Lỗi cập nhật deadline', 'error');
    } finally {
      setIsSubmittingDeadline(false);
    }
  };

  const handleFileUpload = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedFile) {
      return addToast('Vui lòng chọn một tài liệu để upload!', 'error');
    }
    try {
      setIsUploadingFile(true);
      const base64Data = await new Promise((res, rej) => {
        const r = new FileReader();
        r.readAsDataURL(selectedFile);
        r.onload = () => res(r.result);
        r.onerror = rej;
      });

      const finalSubject = uploadSubject.trim() || group?.subject || 'Chung';
      const cleanFileName = customFileName.trim() || selectedFile.name;
      const prefixedName = `[${finalSubject}] ${cleanFileName}`;

      await uploadFile(groupId, {
        fileName: prefixedName,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        fileData: base64Data,
        userId: user.id,
        userFullName: user.fullName
      });
      addToast('Upload tài liệu thành công!', 'success');
      setSelectedFile(null);
      setCustomFileName('');
      setUploadSubject('');
      const fileInput = document.getElementById('file-upload-input');
      if (fileInput) fileInput.value = '';
      fetchGroupFiles();
    } catch (err) {
      addToast(err.message || 'Lỗi upload tài liệu', 'error');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleFileDelete = (fileId) => {
    setConfirmConfig({
      title: 'Xóa tài liệu',
      message: 'Bạn có chắc chắn muốn xóa tài liệu này không?',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try { await deleteFile(fileId); addToast('Đã xóa tài liệu!', 'success'); fetchGroupFiles(); }
        catch (err) { addToast(err.message || 'Lỗi xóa tài liệu', 'error'); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleScheduleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newScheduleTopic.trim()) return addToast('Chủ đề học nhóm không được để trống!', 'error');
    if (!newScheduleDateTime) return addToast('Vui lòng chọn thời gian học!', 'error');
    // Validate: schedule must be within 7 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);
    // Robust parsing for datetime-local string (YYYY-MM-DDTHH:mm) to local Date
    const [dateP, timeP] = newScheduleDateTime.split('T');
    const [y, m, d] = dateP.split('-');
    const [h, min] = timeP.split(':');
    const scheduleDateObj = new Date(y, m - 1, d, h, min);

    if (scheduleDateObj > maxDate) {
      return addToast('Thời gian học không được vượt quá 7 ngày kể từ hôm nay!', 'error');
    }
    const isOfflineWithLocation = group?.meetingMode === 'offline' && group?.location && !overrideLocation;
    const locationValue = isOfflineWithLocation
      ? (group.location.name + (group.location.address ? ` — ${group.location.address}` : ''))
      : newScheduleLocation.trim();
    if (!locationValue) return addToast('Vui lòng nhập địa điểm hoặc link phòng học!', 'error');
    try {
      setIsSubmittingSchedule(true);
      await createSchedule(groupId, {
        topic: newScheduleTopic.trim(),
        dateTime: scheduleDateObj.toISOString(),
        location: locationValue,
        locationLat: null,
        locationLng: null,
        description: newScheduleDesc.trim(),
        creatorId: user.id,
        creatorName: user.fullName
      });
      addToast('Tạo lịch học nhóm thành công!', 'success');
      setNewScheduleTopic('');
      setNewScheduleDateTime('');
      setNewScheduleLocation('');
      setNewScheduleDesc('');
      setOverrideLocation(false);
      fetchGroupSchedules();
    } catch (err) {
      addToast(err.message || 'Lỗi khi tạo lịch học', 'error');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleScheduleDelete = (scheduleId) => {
    setConfirmConfig({
      title: 'Xóa lịch học',
      message: 'Bạn có chắc chắn muốn xóa buổi học này không?',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try { await deleteSchedule(scheduleId); addToast('Đã xóa lịch học nhóm!', 'success'); fetchGroupSchedules(); }
        catch (err) { addToast(err.message || 'Lỗi khi xóa lịch học', 'error'); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleDeadlineSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newDeadlineTitle.trim()) return addToast('Tiêu đề công việc không được để trống!', 'error');
    if (!newDeadlineDueDate) return addToast('Vui lòng chọn hạn chót (due date)!', 'error');
    // Validate: deadline must be within 7 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 7);

    const [dateP, timeP] = newDeadlineDueDate.split('T');
    const [y, m, d] = dateP.split('-');
    const [h, min] = timeP.split(':');
    const deadlineDateObj = new Date(y, m - 1, d, h, min);

    if (deadlineDateObj > maxDate) {
      return addToast('Hạn chót không được vượt quá 7 ngày kể từ hôm nay!', 'error');
    }
    try {
      setIsSubmittingDeadline(true);
      const assigneeMemberNew = newDeadlineAssignee !== 'all' ? (() => {
        const u = membersDetails.find(u => String(u.id) === String(newDeadlineAssignee));
        return u ? u.fullName : null;
      })() : null;
      await createDeadline(groupId, {
        title: newDeadlineTitle.trim(),
        dueDate: deadlineDateObj.toISOString(),
        description: newDeadlineDesc.trim(),
        creatorId: user.id,
        assigneeId: newDeadlineAssignee !== 'all' ? newDeadlineAssignee : null,
        assigneeName: assigneeMemberNew,
      });
      addToast('Thêm deadline mới thành công!', 'success');
      setNewDeadlineTitle('');
      setNewDeadlineDueDate('');
      setNewDeadlineDesc('');
      setNewDeadlineAssignee('all');
      fetchGroupDeadlines();
    } catch (err) {
      addToast(err.message || 'Lỗi khi thêm deadline', 'error');
    } finally {
      setIsSubmittingDeadline(false);
    }
  };

  const handleDeadlineDelete = (deadlineId) => {
    setConfirmConfig({
      title: 'Xóa Deadline',
      message: 'Bạn có chắc chắn muốn xóa deadline này không?',
      confirmText: 'Xóa',
      cancelText: 'Giữ lại',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmConfig(null);
        try { await deleteDeadline(deadlineId); addToast('Đã xóa deadline!', 'success'); fetchGroupDeadlines(); }
        catch (err) { addToast(err.message || 'Lỗi khi xóa deadline', 'error'); }
      },
      onCancel: () => setConfirmConfig(null),
    });
  };

  const handleRemindDeadline = async (deadline) => {
    if (remindingIds[deadline.id]) return;
    setRemindingIds(prev => ({ ...prev, [deadline.id]: true }));
    try {
      const dueStr = new Date(deadline.dueDate).toLocaleString('vi-VN');
      const senderName = user.fullName || user.email || 'Trưởng/Phó nhóm';
      const reminderText = `🔔 NHẮC NHỞ DEADLINE\n📌 Công việc: "${deadline.title}"\n⏰ Hạn chót: ${dueStr}\n${deadline.description ? `📝 Ghi chú: ${deadline.description}\n` : ''}👉 Các thành viên vui lòng hoàn thành đúng hạn! — ${senderName}`;
      await sendChatMessage(groupId, {
        content: reminderText,
        fileAttachment: null,
        userId: user.id,
        userFullName: user.fullName,
        userAvatar: user.avatar
      });

      // Save reminder to LocalStorage so it shows in the notification bell for all members
      try {
        const stored = JSON.parse(localStorage.getItem('studyconect_deadline_reminders') || '[]');
        stored.push({
          id: deadline.id,
          groupId: groupId,
          title: deadline.title,
          dueDate: deadline.dueDate,
          description: deadline.description || '',
          createdAt: new Date().toISOString(),
          userIds: group?.members || [user.id]
        });
        localStorage.setItem('studyconect_deadline_reminders', JSON.stringify(stored));
      } catch (e) {
        console.warn('Lỗi lưu nhắc nhở LocalStorage:', e);
      }

      addToast('Đã gửi nhắc nhở đến chat nhóm!', 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi khi gửi nhắc nhở', 'error');
    } finally {
      setRemindingIds(prev => ({ ...prev, [deadline.id]: false }));
    }
  };

  const handleSubmitAssignment = async () => {
    if (!showSubmitModal) return;
    setIsSubmitting(true);
    try {
      let fileData = null, fileName = null;
      if (submitFile) {
        fileName = submitFile.name;
        fileData = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = e => res(e.target.result);
          reader.onerror = rej;
          reader.readAsDataURL(submitFile);
        });
      }
      const all = loadSubmissions();
      const list = all[showSubmitModal] || [];
      const existingIdx = list.findIndex(s => String(s.userId) === String(user.id));
      const entry = {
        userId: user.id,
        userName: user.fullName,
        userInitial: (user.fullName || 'U')[0].toUpperCase(),
        note: submitNote.trim(),
        fileName,
        fileData,
        submittedAt: new Date().toISOString(),
      };
      if (existingIdx >= 0) list[existingIdx] = entry;
      else list.push(entry);
      all[showSubmitModal] = list;
      saveSubmissions(all);
      setSubmissions({ ...all });
      try {
        await toggleDeadline(showSubmitModal);
      } catch {
        // Safe check
      }
      fetchGroupDeadlines();
      addToast('Nộp bài thành công! ✅', 'success');
      setShowSubmitModal(null);
      setSubmitNote('');
      setSubmitFile(null);
    } catch {
      addToast('Lỗi khi nộp bài', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMsgReact = (msgId, emoji) => {
    setMsgReactions(prev => {
      const updated = { ...prev };
      const list = [...(updated[msgId] || [])];
      const myIdx = list.findIndex(r => r.userId === user.id && r.emoji === emoji);
      if (myIdx >= 0) list.splice(myIdx, 1);
      else list.push({ userId: user.id, emoji });
      updated[msgId] = list;
      localStorage.setItem(STORAGE_KEYS.reactions(groupId), JSON.stringify(updated));
      return updated;
    });
  };

  const handleMsgDelete = async (msgId) => {
    try {
      await deleteChatMessage(msgId, user.id);
      setChatMessages(prev => prev.filter(m => m.id !== msgId));
      addToast('Đã xóa tin nhắn', 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi khi xóa tin nhắn', 'error');
    }
  };

  const handleMsgPin = async (msgId) => {
    try {
      await togglePinChatMessage(msgId);
      await fetchChatMessages();
      addToast('Đã thay đổi trạng thái ghim tin nhắn!', 'success');
    } catch (err) {
      addToast(err.message || 'Lỗi khi ghim tin nhắn', 'error');
    }
  };

  const handleSendChatMessage = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!chatInput.trim() && !chatAttachedFile) return;
    setIsSendingChatMessage(true);
    try {
      let fileAttachment = null;
      if (chatAttachedFile) {
        const MAX_CHAT_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        if (chatAttachedFile.size > MAX_CHAT_FILE_SIZE) {
          addToast('File đính kèm chat quá lớn! Vui lòng chọn file nhỏ hơn 20MB.', 'error');
          setIsSendingChatMessage(false);
          return;
        }
        const base64Data = await new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(chatAttachedFile);
        });
        fileAttachment = {
          fileName: chatAttachedFile.name,
          fileType: chatAttachedFile.type,
          fileData: base64Data,
          fileSize: formatBytes(chatAttachedFile.size),
          name: chatAttachedFile.name, // legacy fallback
          type: chatAttachedFile.type, // legacy fallback
          data: base64Data,            // legacy fallback
        };
      }
      await sendChatMessage(groupId, {
        content: chatInput.trim(),
        fileAttachment,
        userId: user.id,
        userFullName: user.fullName,
        userAvatar: user.avatar,
        replyTo: replyTo ? {
          id: replyTo.id,
          userFullName: replyTo.userFullName,
          content: replyTo.content,
        } : null
      });
      setChatInput('');
      setChatAttachedFile(null);
      const fileInput = document.getElementById('chat-file-input');
      if (fileInput) fileInput.value = '';
      setReplyTo(null);
      await fetchChatMessages();
    } catch (err) {
      addToast(err.message || 'Lỗi gửi tin nhắn', 'error');
    } finally {
      setIsSendingChatMessage(false);
    }
  };

  const unreadChatCount = chatMessages.filter(msg => {
    return String(msg.userId) !== String(user?.id) && new Date(msg.createdAt) > new Date(chatLastSeenTime);
  }).length;

  return {
    group,
    loading,
    activeTab,
    setActiveTab,
    isAssigningDeputy,
    friendRequestingIds,
    kickingIds,
    membersDetails,
    friendships,
    files,
    selectedFile,
    setSelectedFile,
    customFileName,
    setCustomFileName,
    uploadSubject,
    setUploadSubject,
    isUploadingFile,
    schedules,
    newScheduleTopic,
    setNewScheduleTopic,
    newScheduleDateTime,
    setNewScheduleDateTime,
    newScheduleLocation,
    setNewScheduleLocation,
    newScheduleDesc,
    setNewScheduleDesc,
    isSubmittingSchedule,
    editingSchedule,
    setEditingSchedule,
    editScheduleTopic,
    setEditScheduleTopic,
    editScheduleDateTime,
    setEditScheduleDateTime,
    editScheduleLocation,
    setEditScheduleLocation,
    editScheduleDesc,
    setEditScheduleDesc,
    overrideLocation,
    setOverrideLocation,
    deadlines,
    newDeadlineTitle,
    setNewDeadlineTitle,
    newDeadlineDueDate,
    setNewDeadlineDueDate,
    newDeadlineDesc,
    setNewDeadlineDesc,
    newDeadlineAssignee,
    setNewDeadlineAssignee,
    isSubmittingDeadline,
    editingDeadline,
    setEditingDeadline,
    editDeadlineTitle,
    setEditDeadlineTitle,
    editDeadlineDueDate,
    setEditDeadlineDueDate,
    editDeadlineDesc,
    setEditDeadlineDesc,
    editDeadlineAssignee,
    setEditDeadlineAssignee,
    urgentDeadlinesCount,
    submissions,
    showSubmitModal,
    setShowSubmitModal,
    submitNote,
    setSubmitNote,
    submitFile,
    setSubmitFile,
    isSubmitting,
    showSubmissionsFor,
    setShowSubmissionsFor,
    remindingIds,
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
    handleAssignDeputy,
    handleRemoveDeputy,
    handleSendFriendRequest,
    handleKickMember,
    openEditSchedule,
    handleUpdateSchedule,
    openEditDeadline,
    handleUpdateDeadline,
    handleFileUpload,
    handleFileDelete,
    handleScheduleSubmit,
    handleScheduleDelete,
    handleDeadlineSubmit,
    handleDeadlineDelete,
    handleRemindDeadline,
    handleSubmitAssignment,
    handleMsgReact,
    handleMsgDelete,
    handleMsgPin,
    handleSendChatMessage,
    unreadChatCount,
    confirmConfig,
    setConfirmConfig,
    onlineUserIds,
  };
}
