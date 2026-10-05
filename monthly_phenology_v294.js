// Relative monthly activity for wild fruiting in Poland. Heuristic, not probability.
// Jan..Dec. Typical windows; atypical fruiting during warm winters is not predicted.
// Sources and modelling limits: KALENDARZ_OWOCOWANIA_v294.md (development report).
(function(root){
 const rows={
 borowik:[0,0,0,0,.35,.65,.8,1,1,.85,.35,0],
 ceglastopory:[0,0,0,0,.5,.8,.9,1,1,.75,.25,0],
 ponury:[0,0,0,0,0,.65,.9,1,1,.6,0,0],
 gorzkoborowik:[0,0,0,0,0,.5,.85,1,1,.6,0,0],
 kozlarz_babka:[0,0,0,0,0,.6,.8,1,1,.65,0,0],
 podgrzybek:[0,0,0,0,0,.45,.6,.85,1,1,.5,0],
 maslak_zolty:[0,0,0,0,0,.5,.75,1,1,.7,0,0],
 maslak_sitarz:[0,0,0,0,0,.35,.65,.85,1,.9,.3,0],
 maslak_pstry:[0,0,0,0,0,.35,.6,.85,1,.9,.3,0],
 opienka_ciemna:[0,0,0,0,0,0,0,0,.75,1,.65,0],
 opienka_miodowa:[0,0,0,0,0,0,0,0,.7,1,.7,0],
 kania:[0,0,0,0,0,0,.6,.85,1,1,0,0],
 kania_gwiazdzista:[0,0,0,0,0,0,.6,.85,1,.85,0,0],
 czernidlak:[0,0,0,.4,.6,.7,.7,.85,1,.9,.4,0],
 pieczarka_polna:[0,0,0,0,.4,.65,.8,1,1,.7,.25,0],
 purchawka_oczkowana:[0,0,0,0,.4,.65,.8,1,1,.7,0,0],
 kurka:[0,0,0,0,0,.65,.9,1,1,.8,.3,0],
 goryczak:[0,0,0,0,0,.5,.8,1,1,.65,.25,0],
 szatanski:[0,0,0,0,0,.5,.85,1,.85,.35,0,0],
 borowik_usiatkowany:[0,0,0,0,.6,.9,1,1,.8,.4,0,0],
 borowik_sosnowy:[0,0,0,0,.5,.7,.8,.9,1,.8,.3,0],
 maslak_zwyczajny:[0,0,0,0,0,.5,.75,1,1,.7,0,0],
 rydz:[0,0,0,0,0,0,0,.7,1,1,.55,0],
 kozlarz_czerwony:[0,0,0,0,0,.6,.8,1,1,.65,0,0],
 kozlarz_pomaranczowozolty:[0,0,0,0,0,.6,.8,1,1,.65,0,0],
 mleczaj_swierkowy:[0,0,0,0,0,0,.4,.75,1,1,.5,0],
 siedzun_sosnowy:[0,0,0,0,0,0,0,.7,1,.75,0,0],
 kozlarz_grabowy:[0,0,0,0,0,.65,1,1,.65,.3,0,0],
 maslak_ziarnisty:[0,0,0,0,.5,.7,.8,.9,1,.8,.3,0],
 pieprznik_trabkowy:[0,0,0,0,0,0,0,.35,.7,1,.9,.35],
 lejkowiec_dety:[0,0,0,0,0,0,.4,.75,1,.85,.35,0],
 kolczak_oblaczasty:[0,0,0,0,0,0,.4,.75,1,.85,.35,0],
 podgrzybek_zajaczek:[0,0,0,0,0,.5,.75,.9,1,.8,.3,0],
 gaska_nieksztaltna:[0,0,0,0,0,0,0,0,.35,.8,1,.5],
 twardzioszek_przydrozny:[0,0,0,.3,.6,.8,.9,1,1,.75,.3,0],
 boczniak_ostrygowaty:[.65,.5,.25,0,0,0,0,0,.25,.65,1,1],
 kozlarz_debowy:[0,0,0,0,0,.5,.75,1,1,.75,0,0],
 kozlarz_sosnowy:[0,0,0,0,0,.5,.75,1,1,.75,0,0],
 golabek_zielonawy:[0,0,0,0,0,.4,.75,1,1,.65,0,0],
 golabek_bagienny:[0,0,0,0,0,.4,.75,1,1,.65,0,0]
 };
 for(const row of Object.values(rows))Object.freeze(row);
 const api={rows:Object.freeze(rows),factor(type,month){return rows[type]?.[month-1]??0;}};
 root.MonthlyPhenologyV294=api;
 if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
