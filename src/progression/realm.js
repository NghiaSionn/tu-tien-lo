// Cảnh giới: 18 bậc, công thức giữ đúng baseline v0.1.
import { REALM } from '../core/config.js';

export const REALMS = ['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh'];
export const STAGES = ['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ'];
export const MAX_L = REALM.MAX_L;

export const realmOf = L => L < 9 ? 0 : 1 + Math.floor((L - 9) / 3);
export const levelName = L => L < 9 ? `Luyện Khí · Tầng ${L + 1}` : `${REALMS[realmOf(L)]} · ${STAGES[(L - 9) % 3]}`;
export const isMajor = L => L < MAX_L && realmOf(L + 1) !== realmOf(L);
export const power = L => (1 + REALM.POWER_PER_L * L) * Math.pow(REALM.POWER_REALM, realmOf(L));
export const maxHp = L => Math.round(REALM.HP_BASE * power(L));
export const atk = L => Math.round(REALM.ATK_BASE * power(L));
export const need = L => Math.round(REALM.NEED_BASE * Math.pow(REALM.NEED_GROWTH, L));
