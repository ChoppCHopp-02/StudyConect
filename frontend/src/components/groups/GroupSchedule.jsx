import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { geocodeAddress, staticMapUrl, googleMapsSearchUrl } from '../../utils/geocoding';

export default function GroupSchedule({
  group,
  user,
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
  openEditSchedule,
  handleUpdateSchedule,
  handleScheduleSubmit,
  handleScheduleDelete,
  addToast,
}) {
  const generateRoomLink = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const seg = (len) =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const roomCode = `${seg(3)}-${seg(4)}-${seg(3)}`;
    const link = `/room/${roomCode}`;
    setNewScheduleLocation(link);
    if (addToast) addToast('Đã tạo link phòng học! Chia sẻ link này với thành viên.', 'success');
  };

  // ── Geocoding state (chỉ dùng cho offline) ─────────────────────────────
  const [geoPreview, setGeoPreview] = useState(null);   // { lat, lng, formattedAddress, imgUrl }
  const [geoLoading, setGeoLoading] = useState(false);
  const [editGeoPreview, setEditGeoPreview] = useState(null);
  const [editGeoLoading, setEditGeoLoading] = useState(false);

  const handleLocationBlur = useCallback(async (address) => {
    if (!address?.trim() || group?.meetingMode !== 'offline') return;
    setGeoLoading(true);
    const result = await geocodeAddress(address);
    if (result) {
      setGeoPreview({
        ...result,
        imgUrl: staticMapUrl({ lat: result.lat, lng: result.lng }),
        mapsUrl: googleMapsSearchUrl(address),
      });
    } else {
      setGeoPreview({ mapsUrl: googleMapsSearchUrl(address) }); // fallback — chỉ link
    }
    setGeoLoading(false);
  }, [group?.meetingMode]);

  const handleEditLocationBlur = useCallback(async (address) => {
    if (!address?.trim() || group?.meetingMode !== 'offline') return;
    setEditGeoLoading(true);
    const result = await geocodeAddress(address);
    if (result) {
      setEditGeoPreview({
        ...result,
        imgUrl: staticMapUrl({ lat: result.lat, lng: result.lng }),
        mapsUrl: googleMapsSearchUrl(address),
      });
    } else {
      setEditGeoPreview({ mapsUrl: googleMapsSearchUrl(address) });
    }
    setEditGeoLoading(false);
  }, [group?.meetingMode]);

  const isLeaderOrDeputy = user?.id === group?.creatorId || user?.id === group?.deputyId;

  const getLocationStr = (loc) => typeof loc === 'string' ? loc : (loc?.name || loc?.address || '');

  // eslint-disable-next-line no-undef
  const activeGeoPreview = (!overrideLocation && group?.location?.lat)
    ? {
        lat: group.location.lat,
        lng: group.location.lng,
        formattedAddress: getLocationStr(group.location),
        imgUrl: staticMapUrl({ lat: group.location.lat, lng: group.location.lng }),
        mapsUrl: googleMapsSearchUrl(getLocationStr(group.location)),
      }
    : geoPreview;

  // eslint-disable-next-line no-undef
  const activeLocationName = (!overrideLocation && group?.location) ? getLocationStr(group.location) : newScheduleLocation;


  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      {isLeaderOrDeputy && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h3 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--text-primary)' }}>
            Lên lịch học nhóm mới
          </h3>
          <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2col-responsive" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Chủ đề học *</label>
                <div className="form-input-wrap">
                  <input
                    type="text"
                    className="form-input no-icon"
                    placeholder="Chủ đề hoặc nội dung buổi học hôm nay"
                    value={newScheduleTopic}
                    onChange={(e) => setNewScheduleTopic(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Thời gian học *</label>
                <div className="form-input-wrap">
                  <input
                    type="datetime-local"
                    className="form-input no-icon"
                    value={newScheduleDateTime}
                    min={new Date(new Date() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                    max={(() => { const d = new Date(); d.setDate(d.getDate() + 7); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                    onChange={(e) => setNewScheduleDateTime(e.target.value)}
                    required
                  />
                </div>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Chỉ đặt lịch tối đa 7 ngày tới</p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                {group.meetingMode === 'offline' ? 'Địa điểm gặp mặt' : 'Link phòng học *'}
              </label>
              {group.meetingMode === 'offline' ? (
                <div>
                  <div className="form-input-wrap" style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="form-input no-icon"
                      placeholder="Nhập tên nơi gặp mặt"
                      value={!overrideLocation && group?.location ? getLocationStr(group.location) : newScheduleLocation}
                      onChange={(e) => { 
                        if (!overrideLocation && group?.location) setOverrideLocation(true);
                        setNewScheduleLocation(e.target.value); 
                        setGeoPreview(null); 
                      }}
                      onBlur={(e) => handleLocationBlur(e.target.value)}
                      required
                      readOnly={!overrideLocation && group?.location}
                      style={{
                        paddingRight: (!overrideLocation && group?.location) ? '100px' : '12px',
                        backgroundColor: (!overrideLocation && group?.location) ? 'rgba(255,255,255,0.05)' : undefined,
                        color: (!overrideLocation && group?.location) ? 'var(--text-secondary)' : undefined
                      }}
                    />
                    {!overrideLocation && group?.location && (
                      <button
                        type="button"
                        onClick={() => {
                          setOverrideLocation(true);
                          setNewScheduleLocation('');
                          setGeoPreview(null);
                        }}
                        title="Thay đổi địa điểm"
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))',
                          border: '1.5px solid rgba(16,185,129,0.4)',
                          borderRadius: 'var(--radius-sm)',
                          color: '#10b981',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '4px 12px',
                          fontFamily: 'inherit',
                        }}
                      >
                        Thay đổi
                      </button>
                    )}
                  </div>

                  {/* Map preview */}
                  {geoLoading && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #10b981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Đang tìm địa điểm...
                    </div>
                  )}
                  {!geoLoading && activeGeoPreview && (
                    <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.05)' }}>
                      {activeGeoPreview.imgUrl && (
                        <img
                          src={activeGeoPreview.imgUrl}
                          alt="Bản đồ địa điểm"
                          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>📍 {activeLocationName}</div>
                          {activeGeoPreview.formattedAddress && activeGeoPreview.formattedAddress !== activeLocationName && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{activeGeoPreview.formattedAddress}</div>
                          )}
                        </div>
                        <a
                          href={activeGeoPreview.mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#10b981,#059669)', padding: '6px 12px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(16,185,129,0.35)' }}
                        >
                          Mở Maps
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-wrap-responsive" style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                  <div className="form-input-wrap" style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="form-input no-icon"
                      placeholder="Dán link Google Meet, Zoom... hoặc nhấn 'Tạo phòng học'"
                      value={newScheduleLocation}
                      onChange={(e) => setNewScheduleLocation(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={generateRoomLink}
                    title="Tạo link phòng học trực tuyến"
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '0 18px',
                      background: 'linear-gradient(135deg, rgba(62,207,207,0.15), rgba(108,99,255,0.15))',
                      border: '1.5px solid rgba(62,207,207,0.4)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--secondary)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontFamily: 'inherit',
                    }}
                  >
                    Tạo phòng học
                  </button>
                </div>
              )}
              {newScheduleLocation.startsWith('/room/') && (
                <div
                  style={{
                    marginTop: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, rgba(62,207,207,0.07), rgba(108,99,255,0.07))',
                    border: '1px solid rgba(62,207,207,0.2)',
                    borderRadius: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>✅</span>
                    <span style={{ fontSize: '13px', color: 'var(--secondary)', fontWeight: 600 }}>
                      Phòng học đã sẵn sàng
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(window.location.origin + newScheduleLocation);
                        if (addToast) addToast('Đã sao chép link phòng học!', 'success');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(62,207,207,0.3)',
                        color: 'var(--secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '6px 12px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      🔗 Sao chép link
                    </button>
                    <Link
                      to={`${newScheduleLocation}?group=${encodeURIComponent(group?.name || '')}&groupId=${group?.id || ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '7px 16px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 10px rgba(108,99,255,0.3)',
                      }}
                    >
                      Mở phòng học
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Mô tả chi tiết</label>
              <textarea
                className="form-textarea"
                placeholder="Mô tả nội dung buổi học, tài liệu cần chuẩn bị, yêu cầu trước khi học..."
                value={newScheduleDesc}
                onChange={(e) => setNewScheduleDesc(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: 'max-content', alignSelf: 'flex-end', padding: '10px 24px' }}
              disabled={isSubmittingSchedule}
            >
              {isSubmittingSchedule ? 'Đang lên lịch...' : 'Lên lịch học'}
            </button>
          </form>
        </div>
      )}

      <div id="group-schedule-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Lịch học sắp tới ({schedules.length})</h3>
        {schedules.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}
          >
            <p style={{ color: 'var(--text-muted)' }}>Chưa có lịch học nhóm nào được tạo.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {schedules.map((sched) => {
              const canDelete = sched.creatorId === user.id || group.creatorId === user.id;
              const isLink = sched.location.startsWith('http://') || sched.location.startsWith('https://');
              return (
                <div
                  key={sched.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div>
                      <span
                        style={{
                          fontSize: '11px',
                          background: 'var(--primary-light)',
                          color: 'var(--bg)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {new Date(sched.dateTime).toLocaleString('vi-VN')}
                      </span>
                      <h4
                        style={{
                          fontSize: '17px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          marginTop: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        {sched.topic}
                      </h4>
                    </div>
                    {canDelete && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => openEditSchedule(sched)}
                          style={{
                            background: 'rgba(108, 99, 255, 0.1)',
                            border: '1.5px solid rgba(108, 99, 255, 0.2)',
                            color: 'var(--primary-light)',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleScheduleDelete(sched.id)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1.5px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--error)',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          Hủy lịch
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <strong style={{ color: 'var(--text-muted)' }}>Địa điểm/Phòng học:</strong>
                      {sched.location.startsWith('/room/') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: 'rgba(62,207,207,0.12)',
                              color: 'var(--secondary)',
                              padding: '3px 8px',
                              borderRadius: '20px',
                              border: '1px solid rgba(62,207,207,0.3)',
                            }}
                          >
                            Phòng học trực tuyến StudyConnect
                          </span>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <Link
                              to={`${sched.location}?group=${encodeURIComponent(group?.name || '')}&groupId=${group?.id || ''}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                                color: '#fff',
                                textDecoration: 'none',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                boxShadow: '0 2px 6px rgba(108,99,255,0.3)',
                              }}
                            >
                              Vào phòng học
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(window.location.origin + sched.location);
                                if (addToast) addToast('Đã sao chép link phòng học!', 'success');
                              }}
                              style={{
                                background: 'none',
                                border: '1px solid var(--border)',
                                color: 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                              }}
                            >
                              Copy link
                            </button>
                          </div>
                        </div>
                      ) : isLink ? (
                        <a
                          href={sched.location}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary-light)', textDecoration: 'underline', fontWeight: 600, marginTop: '2px' }}
                        >
                          Vào phòng học trực tuyến
                        </a>
                      ) : (
                        // Plain text location (offline / custom)
                        <div style={{ marginTop: '2px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>📍</span>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>{sched.location}</div>
                          </div>
                          <a
                            href={googleMapsSearchUrl(sched.location)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#10b981,#059669)', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', boxShadow: '0 2px 6px rgba(16,185,129,0.3)' }}
                          >
                            Xem trên Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                    {sched.description && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '2px' }}>
                        <strong style={{ color: 'var(--text-muted)' }}>Chi tiết: </strong>
                        <span style={{ color: 'var(--text-secondary)' }}>{sched.description}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                    Lên lịch {sched.creatorName ? `bởi ${sched.creatorName}` : ''} vào {new Date(sched.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit schedule modal */}
      {editingSchedule && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setEditingSchedule(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', fontWeight: 700 }}>Sửa lịch học</h3>
            <form onSubmit={handleUpdateSchedule} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Chủ đề buổi học *
                </label>
                <input
                  value={editScheduleTopic}
                  onChange={(e) => setEditScheduleTopic(e.target.value)}
                  placeholder="Ôn tập Giải tích chương 3"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Thời gian *
                </label>
                <input
                  type="datetime-local"
                  value={editScheduleDateTime}
                  onChange={(e) => setEditScheduleDateTime(e.target.value)}
                  min={new Date(new Date() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  max={(() => { const d = new Date(); d.setDate(d.getDate() + 7); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })()}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Chỉ đặt lịch tối đa 7 ngày tới</p>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Địa điểm / Link
                </label>
                <input
                  value={editScheduleLocation}
                  onChange={(e) => { setEditScheduleLocation(e.target.value); setEditGeoPreview(null); }}
                  onBlur={(e) => handleEditLocationBlur(e.target.value)}
                  placeholder="Địa điểm hoặc link meet"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
                {/* Map preview in edit modal */}
                {editGeoLoading && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>Đang tìm địa điểm...</div>
                )}
                {!editGeoLoading && editGeoPreview && (
                  <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(16,185,129,0.3)' }}>
                    {editGeoPreview.imgUrl && (
                      <img src={editGeoPreview.imgUrl} alt="map" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    )}
                    <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'rgba(16,185,129,0.05)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981' }}>📍 {editScheduleLocation}</span>
                      <a href={editGeoPreview.mapsUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#10b981,#059669)', padding: '4px 10px', borderRadius: 7, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        Mở Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Ghi chú
                </label>
                <textarea
                  value={editScheduleDesc}
                  onChange={(e) => setEditScheduleDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSchedule}
                  style={{
                    padding: '10px 24px',
                    background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  {isSubmittingSchedule ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}