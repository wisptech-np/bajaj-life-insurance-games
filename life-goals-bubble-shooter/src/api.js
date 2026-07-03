// LMS lead-capture + slot-booking integration.
// `__LMS_BASE_URL__` and `__LMS_UPDATE_BASE_URL__` are injected at build time by vite.config.js.

export async function submitToLMS({ name, mobile, score, summaryDtls = 'Life Goals Bubble Shooter Lead' }) {
  const userId = sessionStorage.getItem('gamification_userId') || '';
  const gameID = sessionStorage.getItem('gamification_gameId') || '';

  const payload = {
    cust_name: name || '',
    mobile_no: mobile || '',
    dob: '',
    gender: 'M',
    pincode: '',
    email_id: '',
    life_goal_category: '',
    investment_amount: '',
    product_id: '',
    p_source: sessionStorage.getItem('gamification_referral') === 'Y' ? 'Referral' : 'Marketing Assist',
    p_data_source: 'GAMIFICATION',
    pasa_amount: '',
    product_name: '',
    pasa_product: '',
    associated_rider: '',
    customer_app_product: '',
    p_data_medium: ' GAMIFICATION ',
    utmSource: '',
    userId,
    gameID,
    remarks: `Game: ${gameID}${score != null ? ` | Score: ${score}` : ''} | ${summaryDtls}`,
    appointment_date: '',
    appointment_time: '',
  };

  try {
    const res = await fetch(`${__LMS_BASE_URL__}/whatsappInhouse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return { success: res.ok, ...json };
  } catch (err) {
    console.error('[api] submitToLMS failed', err);
    return { success: false, error: err.message };
  }
}

export async function updateLeadNew(leadNo, { name, mobile, date, time, remarks }) {
  let formattedDate = '';
  if (date) {
    const [year, month, day] = date.split('-');
    formattedDate = day && month && year ? `${day}/${month}/${year}` : date;
  }

  const payload = {
    leadNo,
    tpa_user_id: '',
    miscObj1: {
      stringval1: '',
      stringval2: name || '',
      stringval3: '',
      stringval4: formattedDate,
      stringval5: time || '',
      stringval6: remarks || 'Slot Booking via Life Goals Bubble Shooter',
      stringval7: 'GAMIFICATION',
      stringval9: mobile || '',
    },
  };

  try {
    const res = await fetch(`${__LMS_UPDATE_BASE_URL__}/updateLeadNew`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    return { success: res.ok, ...json };
  } catch (err) {
    console.error('[api] updateLeadNew failed', err);
    return { success: false, error: err.message };
  }
}

export function extractLeadNo(result) {
  if (!result) return null;
  return (
    result.leadNo ||
    result.LeadNo ||
    (result.data && (result.data.leadNo || result.data.LeadNo)) ||
    null
  );
}

export const LEAD_NO_KEY = 'lifeGoalsBubbleShooterLeadNo';
