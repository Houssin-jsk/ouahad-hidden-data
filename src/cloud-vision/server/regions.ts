// Gemini unpaid clients exclude EEA, Switzerland and UK. Unknown regions fail closed.
// Source: https://ai.google.dev/gemini-api/docs/available-regions and /terms
const supported = new Set(
  "AL DZ AS AD AO AI AQ AG AR AM AW AU AZ BS BH BD BB BZ BJ BM BT BO BA BW BR IO VG BN BF BI CV KH CM CA BQ KY CF TD CL CX CC CO KM CK CR CI CW CD DJ DM DO EC EG SV GQ ER SZ ET FK FO FJ GF GA GM GE GH GI GL GD GU GT GG GN GW GY HT HM HN IN ID IQ IM IL JM JP JE JO KZ KE KI XK KW KG LA LB LS LR LY MG MW MY MV ML MH MR MU MX FM MD MC MN ME MS MA MZ NA NR NP NC NZ NI NE NG NU NF MK MP OM PK PW PS PA PG PY PE PH PN PR QA CG RE RW BL SH KN LC PM VC WS SM ST SA SN RS SC SL SG SB SO ZA GS KR SS LK SD SR TW TJ TZ TH TL TG TK TO TT TN TM TC TV TR UG UA AE US UM UY VI UZ VU VA VE VN WF EH YE ZM ZW".split(
    " ",
  ),
);
export const freeGeminiRegion = (country: string) => supported.has(country);
