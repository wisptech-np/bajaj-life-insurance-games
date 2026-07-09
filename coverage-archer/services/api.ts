// LMS lead-capture + slot-booking integration (mirrors life-goals-bubble-shooter/src/api.js).
// `__LMS_BASE_URL__` and `__LMS_UPDATE_BASE_URL__` are injected at build time by vite.config.ts.

export interface LeadPayload {
  name?: string;
  mobile?: string;
  email?: string;
  score?: number | null;
  summaryDtls?: string;
}

export interface SlotPayload {
  name?: string;
  mobile?: string;
  date?: string; // yyyy-mm-dd
  time?: string;
  remarks?: string;
}

export interface ApiResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

export async function submitToLMS({
  name,
  mobile,
  email,
  score,
  summaryDtls = 'Guardian Archer Lead',
}: LeadPayload): Promise<ApiResult> {
  const userId = sessionStorage.getItem('gamification_userId') || '';
  const gameID = sessionStorage.getItem('gamification_gameId') || '';

  const payload = {
    cust_name: name || '',
    mobile_no: mobile || '',
    dob: '',
    gender: 'M',
    pincode: '',
    email_id: email || '',
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
    return { success: false, error: (err as Error).message };
  }
}

export async function updateLeadNew(
  leadNo: string,
  { name, mobile, date, time, remarks }: SlotPayload
): Promise<ApiResult> {
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
      stringval6: remarks || 'Slot Booking via Guardian Archer',
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
    return { success: false, error: (err as Error).message };
  }
}

export function extractLeadNo(result: ApiResult | null | undefined): string | null {
  if (!result) return null;
  const r = result as Record<string, any>;
  return r.leadNo || r.LeadNo || (r.data && (r.data.leadNo || r.data.LeadNo)) || null;
}

export const LEAD_NO_KEY = 'coverageArcherLeadNo';
