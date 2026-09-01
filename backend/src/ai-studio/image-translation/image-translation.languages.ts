export type ImageTranslationLanguage = { code: string; label: string };

// The NLLB-200 model supports these language/script pairs. Keeping the
// catalog in the API makes the UI and provider use the same stable codes.
export const IMAGE_TRANSLATION_LANGUAGES: ImageTranslationLanguage[] = [
  ['afr_Latn','Afrikaans'],['amh_Ethi','Amharic'],['arb_Arab','Arabic'],['ary_Arab','Moroccan Arabic'],['arz_Arab','Egyptian Arabic'],['asm_Beng','Assamese'],['ast_Latn','Asturian'],['awa_Deva','Awadhi'],['azj_Latn','Azerbaijani'],['azb_Arab','South Azerbaijani'],
  ['bak_Cyrl','Bashkir'],['bam_Latn','Bambara'],['ban_Latn','Balinese'],['bel_Cyrl','Belarusian'],['bem_Latn','Bemba'],['ben_Beng','Bengali'],['bho_Deva','Bhojpuri'],['bos_Latn','Bosnian'],['bug_Latn','Buginese'],['bul_Cyrl','Bulgarian'],
  ['cat_Latn','Catalan'],['ceb_Latn','Cebuano'],['ces_Latn','Czech'],['cjk_Latn','Chokwe'],['ckb_Arab','Central Kurdish'],['cmn_Hans','Chinese (Simplified)'],['cmn_Hant','Chinese (Traditional)'],['crh_Latn','Crimean Tatar'],['cym_Latn','Welsh'],['dan_Latn','Danish'],
  ['deu_Latn','German'],['dik_Latn','Southwestern Dinka'],['dyu_Latn','Dyula'],['dzo_Tibt','Dzongkha'],['ell_Grek','Greek'],['eng_Latn','English'],['epo_Latn','Esperanto'],['est_Latn','Estonian'],['eus_Latn','Basque'],['ewe_Latn','Ewe'],
  ['fao_Latn','Faroese'],['fij_Latn','Fijian'],['fin_Latn','Finnish'],['fon_Latn','Fon'],['fra_Latn','French'],['fur_Latn','Friulian'],['fuv_Latn','Nigerian Fulfulde'],['gaz_Latn','West Central Oromo'],['gla_Latn','Scottish Gaelic'],['gle_Latn','Irish'],
  ['glg_Latn','Galician'],['grn_Latn','Guarani'],['guj_Gujr','Gujarati'],['hat_Latn','Haitian Creole'],['hau_Latn','Hausa'],['heb_Hebr','Hebrew'],['hin_Deva','Hindi'],['hne_Deva','Chhattisgarhi'],['hrv_Latn','Croatian'],['hun_Latn','Hungarian'],
  ['hye_Armn','Armenian'],['ibo_Latn','Igbo'],['ilo_Latn','Ilocano'],['ind_Latn','Indonesian'],['isl_Latn','Icelandic'],['ita_Latn','Italian'],['jav_Latn','Javanese'],['jpn_Jpan','Japanese'],['kab_Latn','Kabyle'],['kac_Latn','Kachin'],
  ['kam_Latn','Kamba'],['kan_Knda','Kannada'],['kas_Arab','Kashmiri (Arabic)'],['kas_Deva','Kashmiri (Devanagari)'],['kat_Geor','Georgian'],['kaz_Cyrl','Kazakh'],['kbp_Latn','Kabuverdianu'],['kea_Latn','Kabuverdianu'],['khm_Khmr','Khmer'],['kin_Latn','Kinyarwanda'],
  ['kir_Cyrl','Kyrgyz'],['kmb_Latn','Kimbundu'],['kmr_Latn','Northern Kurdish'],['kon_Latn','Kikongo'],['kor_Hang','Korean'],['lao_Laoo','Lao'],['lij_Latn','Ligurian'],['lim_Latn','Limburgish'],['lin_Latn','Lingala'],['lit_Latn','Lithuanian'],
  ['ltg_Latn','Latgalian'],['ltz_Latn','Luxembourgish'],['lua_Latn','Luba-Katanga'],['lug_Latn','Ganda'],['luo_Latn','Luo'],['lus_Latn','Mizo'],['lvs_Latn','Latvian'],['mag_Deva','Magahi'],['mai_Deva','Maithili'],['mal_Mlym','Malayalam'],
  ['mar_Deva','Marathi'],['min_Latn','Minangkabau'],['mkd_Cyrl','Macedonian'],['mlt_Latn','Maltese'],['mni_Beng','Manipuri'],['mon_Cyrl','Mongolian'],['mri_Latn','Māori'],['mya_Mymr','Burmese'],['nld_Latn','Dutch'],['nno_Latn','Norwegian Nynorsk'],
  ['nob_Latn','Norwegian Bokmål'],['npi_Deva','Nepali'],['nso_Latn','Northern Sotho'],['nya_Latn','Chichewa'],['oci_Latn','Occitan'],['ory_Orya','Odia'],['pag_Latn','Pangasinan'],['pan_Guru','Punjabi'],['pap_Latn','Papiamento'],['pbt_Arab','Southern Pashto'],
  ['pes_Arab','Persian'],['plt_Latn','Plateau Malagasy'],['pol_Latn','Polish'],['por_Latn','Portuguese'],['prs_Arab','Dari'],['quy_Latn','Quechua'],['ron_Latn','Romanian'],['run_Latn','Rundi'],['rus_Cyrl','Russian'],['sag_Latn','Sango'],
  ['san_Deva','Sanskrit'],['sat_Olck','Santali'],['scn_Latn','Sicilian'],['shn_Mymr','Shan'],['sin_Sinh','Sinhala'],['skr_Arab','Saraiki'],['slk_Latn','Slovak'],['slv_Latn','Slovenian'],['smo_Latn','Samoan'],['sna_Latn','Shona'],
  ['snd_Arab','Sindhi'],['som_Latn','Somali'],['sot_Latn','Southern Sotho'],['spa_Latn','Spanish'],['srd_Latn','Sardinian'],['srp_Cyrl','Serbian'],['ssw_Latn','Swati'],['sun_Latn','Sundanese'],['swe_Latn','Swedish'],['swh_Latn','Swahili'],
  ['tam_Taml','Tamil'],['tat_Cyrl','Tatar'],['tel_Telu','Telugu'],['tgk_Cyrl','Tajik'],['tha_Thai','Thai'],['tir_Ethi','Tigrinya'],['tpi_Latn','Tok Pisin'],['tsn_Latn','Tswana'],['tso_Latn','Tsonga'],['tuk_Latn','Turkmen'],
  ['tum_Latn','Tumbuka'],['tur_Latn','Turkish'],['twi_Latn','Twi'],['ukr_Cyrl','Ukrainian'],['umb_Latn','Umbundu'],['urd_Arab','Urdu'],['uzn_Latn','Uzbek'],['vec_Latn','Venetian'],['vie_Latn','Vietnamese'],['war_Latn','Waray'],['wol_Latn','Wolof'],['xho_Latn','Xhosa'],['ydd_Hebr','Yiddish'],['yor_Latn','Yoruba'],['zho_Hans','Chinese (Simplified)'],['zho_Hant','Chinese (Traditional)'],['zsm_Latn','Malay'],['zul_Latn','Zulu'],
].map(([code, label]) => ({ code, label }));

export function languageCode(value: string) {
  const normalized = value.trim().toLowerCase();
  return IMAGE_TRANSLATION_LANGUAGES.find(
    (item) => item.code.toLowerCase() === normalized || item.label.toLowerCase() === normalized,
  )?.code ?? value.trim();
}
