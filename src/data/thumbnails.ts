import thumbBusinessSaas from '../assets/images/thumb_business_saas_1794558155494.jpg';
import thumbLocalCraft from '../assets/images/thumb_local_craft_1794558154402.jpg';
import thumbPersonalCreator from '../assets/images/thumb_personal_creator_1794558155737.jpg';
import thumbPoliticsCivic from '../assets/images/thumb_politics_civic_1794558153796.jpg';
import thumbSchoolClub from '../assets/images/thumb_school_club_1794558154678.jpg';
import { VideoCategoryId } from '../types/video';

export const CATEGORY_THUMBNAILS: Record<VideoCategoryId, string> = {
  politics: thumbPoliticsCivic,
  local: thumbLocalCraft,
  school: thumbSchoolClub,
  personal: thumbPersonalCreator,
  business: thumbBusinessSaas,
};
