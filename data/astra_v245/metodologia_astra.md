# Baza ekologiczna grzybów do mapy GIS — wersja konsultacyjna 1.0

Stan opracowania: 21 września 2026 r.

**To obszerny katalog roboczy, a nie potwierdzona kompletna lista wszystkich jadalnych grzybów Polski ani gotowy model prognostyczny.** Zawiera gatunki popularne, regionalne, rzadkie, chronione oraz rekordy historyczne i sporne. Oddziela gatunki od kompleksów i nazw, które mogą być synonimami. Liczba rekordów nie jest liczbą niezależnych gatunków. W Polsce nie istnieje jedna stabilna, bezsporna granica listy „wszystkich jadalnych”: zmieniają się ujęcia gatunków i oceny użytkowe. Nie przeprowadzono pełnego uzgodnienia wszystkich rekordów z aktualnym krajowym wykazem oraz monografiami; nie należy przedstawiać tego pliku użytkownikom jako bazy w pełni zweryfikowanej.

Każdy rekord ma cały zestaw pól z zamówienia. **Kompletność pól nie oznacza kompletności wiedzy.** „Brak wiarygodnych danych” znaczy, że w tym opracowaniu nie ustalono wystarczająco pewnej wartości, a nie że dowiedziono nieistnienia odpowiednich badań. Nie wstawiono arbitralnych pH, opadów, temperatur, opóźnień ani wag. W JSON brak wartości to `null` z jawnym `powod_braku`; nie wolno zamieniać go na zero. `false` oznacza rzeczywiste zaprzeczenie, a `nie_dotyczy` odrębny stan.

## Jak czytać źródła i pewność

G0 oznacza syntezę ogólnej wiedzy ekologicznej, bez indywidualnego sprawdzenia źródła każdego twierdzenia. H0 oznacza hipotezę do sprawdzenia. Konkretne badania przypisano tylko do tych pól, których dotyczą. Źródło metodologiczne nie potwierdza automatycznie całego rekordu. Jakość „średnia” może dotyczyć znanej niszy, podczas gdy progi do prognozowania nadal mają jakość niską. Nie ma jednego wiarygodnego poziomu pewności dla wszystkich parametrów gatunku.

Przykładowe drzewa zapisano jako konkretne gatunki z nazwami polskimi i naukowymi, wraz z rolą: partner ECM albo źródło drewna/gospodarz. **Lista nie jest wyczerpująca.** Jej niekompletność nie pozwala stosować twardej reguły wykluczającej. U wąsko związanych grzybów ograniczenie często dotyczy rodzaju (np. Larix), a nie wyłącznie jednego gatunku na świecie. Drzewo rosnące w pobliżu owocnika nie dowodzi mikoryzy.

## Statyczne i dynamiczne

Każde pole ma etykietę czasu. `STALY` oznacza np. ekspozycję i wysokość. `STALY_WOLNOZMIENNY` oznacza stan istotny dla potencjału: drzewa, gleba, substrat, TSL, runo. Może zmienić się nagle po wycince, wichurze, melioracji lub wywozie drewna, więc wymaga daty aktualności. `DYNAMICZNY` oznacza pogodę i bieżącą wodę. `FENOLOGIA` to reguła sezonowa; aktualna faza sezonu jest zmienna. `METADANE` nie jest czynnikiem środowiskowym.

## TSL i gleba

Nie znaleziono podstaw do określenia ogólnopolskiego optymalnego TSL dla każdego gatunku. Pola udokumentowanego optimum i dopuszczalnych TSL są więc jawnie nieustalone, a dla siedlisk otwartych — nie dotyczą podstawowej niszy. Osobne pole zawiera **hipotezy kodów TSL**, nie obserwacje ani potwierdzone preferencje. Można ich używać do planowania walidacji, nie jako gotowej maski. Nazwy formacji, zespołów roślinnych i TSL nie są wzajemnie zamienne. Przykładowo obecność sosny nie dowodzi Bśw, a obecność buka nie dowodzi Lśw. Kody i ich wersję należy uzgodnić ze słownikiem konkretnego źródła BDL. [Klasyfikacja TSL](https://www.lasy.gov.pl/pl/edukacja/slownik/t/typ-siedliskowy-lasu).

Piaszczysta/gliniasta opisuje uziarnienie, bielicowa/brunatna — typ gleby; nie są to alternatywne wartości jednego pola. Kwaśny odczyn nie daje prawa do wpisania dowolnego zakresu liczbowego. pH H2O i pH KCl nie są wymienne. Dla Tuber aestivum zapisano osobno rzeczywiście obserwowany zakres pH H2O 7,0–7,5 z sześciu polskich stanowisk; **to nie granice tolerancji**. Wyniki doświadczeń z rozwojem mikoryzy na plantacji również nie są automatycznie optimum owocnikowania w lesie. [Polskie pomiary](https://pbsociety.org.pl/journals/index.php/am/article/download/am.2014.024/3998), [badanie upraw](https://pbsociety.org.pl/journals/index.php/am/article/download/am.2012.019/2213).

## Pogoda i sezon

W bazie nie ma reguł typu „X mm w Y dni daje owocniki po Z dniach”, jeśli nie znaleziono podstaw. Dla większości gatunków wartości pozostają nieustalone. Orientacyjne kalendarze nie są percentylami polskiego zbioru obserwacji; dla rzadkich gatunków nie wolno traktować ich jako krajowych granic sezonu.

Wiosną oddzielić odmarzanie gleby, wodę po zimie, stopniodni i fenologię roślin od samego deszczu. Brak pokrywy śnieżnej nie może automatycznie wyłączać prognozy smardzów czy majówki. Latem i jesienią znaczenie ma bilans wodny, wcześniejsza susza, substrat i stan drzewa, nie tylko ostatni opad. Zimą odwilż może umożliwić dalszy rozwój lub uwidocznić stare owocniki. U uszaków deszcz może nawodnić istniejący owocnik; u trufli data znalezienia nie jest datą powstania. Hiszpańskie modele borowika wskazują rolę zasobów wody, ale nie dostarczają walidowanych polskich progów. [Badanie B. edulis](https://oa.upm.es/48556/).

## Azot, zagęszczenie, konkurencja

Nie przypisano wszystkim grzybom ECM tego samego spadku owocnikowania przy podwyższonym azocie. Sygnały obserwacyjne i eksperymenty mają różną siłę, a wyniki dla grzybni nie są równoważne wynikom dla owocników. Sama odległość od pola nie mierzy depozycji. [Trendy w Holandii](https://doi.org/10.1111/1365-2664.12944), [przegląd dowodów](https://research.fs.usda.gov/treesearch/download/39986.pdf).

Nie zamieniono obserwacji wzrostu przy ścieżce w preferencję zagęszczenia, a badań deptania w progi gęstości objętościowej dla wszystkich gatunków. [Eksperyment terenowy](https://www.wsl.ch/fileadmin/user_upload/WSL/Biodiversitaet/Artenvielfalt/Pilze/Pilzreservat_La_Chaneaz/sdarticle.pdf).

Wspólny gospodarz nie dowodzi wzajemnego pobudzania. Dla większości par grzybów konkurencja i wartość wskaźnikowa pozostają nieustalone. Szczególnie udokumentowany jest układ sosna–maślak sitarz–klejówka różowa; nie należy rozszerzać go na wszystkie maślaki i klejówki. [Badanie układu trójstronnego](https://publications.slu.se/?file=publ%2Fshow&id=88690).

## Status użytkowy i ochrona

J = uznawany za jadalny; W = wymaga uwzględnienia przygotowania/stadium; S = sporny lub historycznie użytkowy; T = trujący albo wykluczony z rekomendacji. To klasy informacyjne, nie instrukcja konsumpcji. Różnice wobec podobnych gatunków nie stanowią kompletnego klucza. Predykcja siedliska nie identyfikuje zebranego owocnika.

Ochrona: S = ścisła, C = częściowa, C* = częściowa z zakresem dotyczącym wskazanych w akcie smardzów, ? = nierozstrzygnięte mapowanie. Przy C* akt wyłącza wskazane okazy z ogrodów, upraw ogrodniczych, szkółek leśnych i terenów zieleni; nie oznacza to, że każdy smardz przy drodze jest legalny do zbioru. Nie przenosić wyjątku na Verpa. Zapis „0” nie jest zgodą na zbiór na obszarach chronionych. [Obowiązujący akt i załączniki](https://eli.gov.pl/eli/DU/2014/1408/ogl).

## Jak użyć tego w mapie

1. Najpierw rozstrzygnąć nazwę i zakres gatunku. Nazwy zbiorcze pozostawić zbiorczo albo wstrzymać model, zamiast udawać dokładność.
2. Potencjał siedliska wyznaczać z partnera/substratu i stanu siedliska. Pusta lub niepełna warstwa drzew oznacza niepewność, nie brak partnera. Korzenie mogą przekraczać granicę wydzielenia; drzewo w domieszce też ma znaczenie.
3. Warunki dzisiejsze oceniać dopiero na tle potencjału i sezonu, z wilgotnością właściwego substratu. Raster opadów nie mierzy wody w kłodzie ani ściółce.
4. Istotność biologiczna nie jest liczbową wagą scoringu. Wymieniono warunki konieczne, preferencje i wskaźniki; wag liczbowych nie ustalono bez kalibracji. Nieustalony wpływ nie oznacza marginalnego.
5. Kalibrację prowadzić osobno dla obecności grzybni/siedliska oraz owocnikowania. Nie mnożyć dowolnych scoringów i nie nazywać wyniku prawdopodobieństwem. Uczyć model na obserwacjach z czasem wizyty i wysiłkiem obserwatora; użyć przestrzennego i czasowego podziału walidacji.
6. Potwierdzenia z GBIF/iNaturalist deduplikować (te same obserwacje mogą być w obu), kontrolować niepewność współrzędnych, oznaczenie, datę, status dziki/uprawny i błędy taksonomiczne. Nie uznano żadnego regionu za „najliczniejszy” tylko na podstawie zgłoszeń. Nie pobrano ani nie przeanalizowano krajowego eksportu tych baz. [GBIF: protokoły i niewykrycia](https://docs.gbif.org/guide-publishing-survey-data/en/), [flagi jakości](https://techdocs.gbif.org/en/data-use/occurrence-issues-and-flags).
7. Przykładowe cechy do porównania w uczeniu: sumy opadów dla kilku okien, bilans opad–ewapotranspiracja, wilgotność gleby, historia suszy, minima temperatury i stopniodni. Dobór okien to hiperparametr eksperymentu, nie wiedza gatunkowa z tej bazy.
8. Zmienne silnie skorelowane (TSL, gleba, runo, gatunki drzew) nie powinny być wielokrotnie liczone jako niezależne potwierdzenia. Nie wymuszać precyzji mapy większej niż rozdzielczość danych.

Brak grzyba na zgłoszeniach oznacza brak dowodu obecności, nie potwierdzoną nieobecność. Wynik przed kalibracją nazywać „zgodność siedliska / warunki sprzyjające”, a nie procentową szansą znalezienia.

## Zakres dalszej walidacji

Przed produkcyjnym użyciem pozostają: pełny audyt krajowej listy gatunków i synonimów, przypisanie źródeł gatunkowych do opisów G0, weryfikacja partnerów i kalendarzy, analiza rzeczywistych obserwacji przestrzennych, kalibracja pogody oraz walidacja niezależna. Dostarczone pliki nie twierdzą, że te prace zostały wykonane. Dotyczy to zwłaszcza rzadkich i krypticznych taksonów.

## Źródła

- **G0**: Synteza ogólnej wiedzy mykologicznej. Opisy jakościowe i orientacyjne kalendarze. Nie przeprowadzono indywidualnej weryfikacji monograficznej każdego twierdzenia; nie jest to cytowanie publikacji ani źródło liczb do kalibracji.
- **H0**: Hipoteza robocza do walidacji lokalnej. Przełożenie niszy na TSL, runo i cechy GIS. Wyłączone z automatycznych twardych filtrów.
- **S01**: [Kotowski, Pietras, Łuczaj 2019 — Extreme levels of mycophilia documented in Mazovia](https://doi.org/10.1186/s13002-019-0291-6). Użytkowanie regionalne, znaczenie poprawnego oznaczania, Hydnum ellipsosporum w Polsce. Użytkowanie nie jest dowodem bezpieczeństwa.
- **S02**: [Fungal ethnoecology: observed habitat preferences … in Poland, 2021](https://doi.org/10.1186/s13002-021-00456-x). Siedliska opisywane przez zbieraczy; nie eksperymentalne progi ani dowód mikoryzy.
- **S03**: [Modelización de producciones forestales no leñosas: aplicación a la fructificación de Boletus edulis … Soria — repozytorium UPM](https://oa.upm.es/48556/). Znaczenie zasobu wody i zmienności klimatu dla B. edulis; brak walidacji transferu do Polski.
- **S04**: [García-Bustamante et al. 2021 — Impact of local and regional climate variability … Soria](https://doi.org/10.1002/joc.7144). B. edulis, Pinus sylvestris, Hiszpania; nie źródło uniwersalnych progów pogodowych.
- **S05**: [van Strien et al. 2018 — Woodland ectomycorrhizal fungi benefit from large-scale reduction in nitrogen deposition](https://doi.org/10.1111/1365-2664.12944). Trendy w Holandii; wskazówka kierunku reakcji, bez ilościowej funkcji dawka–owocnikowanie dla Polski.
- **S06**: [Lilleskov et al. 2011 — Conservation of ectomycorrhizal fungi: exploring the linkages between nitrogen deposition and functional traits](https://research.fs.usda.gov/treesearch/download/39986.pdf). Zróżnicowanie dowodów dotyczących azotu; brak podstaw do identycznej reakcji wszystkich ECM.
- **S07**: [Hilszczańska et al. 2014 — Characteristic of Tuber spp. localities in natural stands](https://pbsociety.org.pl/journals/index.php/am/article/download/am.2014.024/3998). Tuber aestivum: sześć stanowisk, pomiary gleby i roślinności; zakres obserwowany, nie granice tolerancji.
- **S08**: [Thomas 2012 — The role of pH in Tuber aestivum … mycorrhiza development within commercial orchards](https://pbsociety.org.pl/journals/index.php/am/article/download/am.2012.019/2213). Rozwój mikoryzy w brytyjskich uprawach; nie próg owocnikowania w naturalnym lesie polskim.
- **S09**: [Baran i Boroń 2017 — Two species of true morels … Ojców National Park](https://pbsociety.org.pl/journals/index.php/am/article/viewFile/am.1094/7313). Potwierdzenie M. esculenta i M. deliciosa; problemy starszych koncepcji smardzów.
- **S10**: [Olsson et al. 2000 — Molecular and anatomical evidence for a three-way association …](https://publications.slu.se/?file=publ%2Fshow&id=88690). Pinus sylvestris, Suillus bovinus i Gomphidius roseus; szczególna relacja, pasożytnictwo dyskutowane.
- **S11**: [Rozporządzenie w sprawie ochrony gatunkowej grzybów, Dz.U. 2014 poz. 1408](https://api.sejm.gov.pl/eli/acts/DU/2014/1408/text.pdf). Załączniki ochrony gatunkowej. Status aktu obowiązujący w ELI w dniu sprawdzenia. Nie obejmuje wszystkich ograniczeń obszarowych zbioru.
- **S12**: [ELI — status aktu Dz.U. 2014 poz. 1408](https://eli.gov.pl/eli/DU/2014/1408/ogl). Sprawdzenie obowiązywania aktu.
- **S13**: [Lasy Państwowe — Typ siedliskowy lasu](https://www.lasy.gov.pl/pl/edukacja/slownik/t/typ-siedliskowy-lasu). Znaczenie kodów TSL; nie źródło optymalnych TSL poszczególnych grzybów.
- **S14**: [GBIF — Guide for publishing biological survey and monitoring data](https://docs.gbif.org/guide-publishing-survey-data/en/). Obserwacja obecności, niewykrycie i metadane protokołu.
- **S15**: [GBIF — Occurrence issues and flags](https://techdocs.gbif.org/en/data-use/occurrence-issues-and-flags). Jakość współrzędnych i oznaczeń; filtrowanie danych.
- **S16**: [Egli et al. — Mushroom picking does not impair future harvests, 2006](https://www.wsl.ch/fileadmin/user_upload/WSL/Biodiversitaet/Artenvielfalt/Pilze/Pilzreservat_La_Chaneaz/sdarticle.pdf). Efekty zbioru i deptania; nie uniwersalny próg zagęszczenia gleby dla gatunków.
- **S17**: [Yin et al. 2014 — Chemical and toxicological investigations … Tricholoma terreum](https://pubmed.ncbi.nlm.nih.gov/24753190/). Sygnał toksykologiczny w modelu zwierzęcym; nie kliniczny próg bezpieczeństwa ludzi.
- **S18**: [No Evidence Was Found for the Presence of Terreolides … Tricholoma terreum, 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11052463/). Rozbieżność względem wcześniejszych doniesień; nie dowód absolutnego bezpieczeństwa.
- **S19**: [The Yellow Knight Fights Back … Tricholoma equestre, 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6267205/). Głos w sporze o zielonkę, interpretować łącznie z doniesieniami o zatruciach.
- **S20**: [Obara et al. 2008 — Acute encephalopathy associated with Pleurocybella porrigens](https://pubmed.ncbi.nlm.nih.gov/18366348/). Ciężkie zatrucie po boczniance, podstawa wyłączenia z rekomendacji żywnościowych.
- **S21**: [Halbwachs et al. — Hyphae of waxcap fungi colonise plant roots](https://doi.org/10.1016/j.funeco.2013.08.003). Biotrofia grupy wilgotnic; nie pełne rozpoznanie partnerów każdego gatunku.
- **S22**: [Shishikura et al. 2021 — Entoloma clypeatum species complex forms ectomycorrhiza-like roots](https://pubmed.ncbi.nlm.nih.gov/33105488/). Relacje z różowatymi; nie bezpośredni dowód wszystkich par gospodarzy w Polsce.
- **S23**: [Chachuła et al. 2020 — New Record of Macrofungi … Cieszyn Municipality](https://doi.org/10.5586/am.5511). Potwierdzenie Tuber brumale w Cieszynie; nie ograniczenie zasięgu do tego miasta.
- **S24**: [Wilgan 2023 — High Species Diversity but Low Specificity … Tuber in Poland](https://mdpi-res.com/d_attachment/forests/forests-14-02407/article_deploy/forests-14-02407.pdf). Różnorodność trufli i relacje ECM; nie każda trufla w badaniu jest gatunkiem użytkowym.
- **S25**: [Czerniawski, Górszczyk, Rutkowski 2019 — Wodnicha marcowa, nowy gatunek w mykobiocie Polski](https://www.grzybiarze.eu/archiwa/1390). Polskie stwierdzenia H. marzuolus; brak kalibracji czasu od roztopów.
- **S26**: [Wojewoda 2003 — Checklist of Polish larger Basidiomycetes](https://botany.pl/images/Books/Wojewoda_2003_Checklist_of_Polish_larger_Basidiomycetes.pdf). Punkt odniesienia nazw i historycznych stwierdzeń; nie wykonano pełnego uzgodnienia całej bazy z monografią. Status ochrony i taksonomia mogą być przestarzałe.
- **S27**: [Bocian 2017 — stanowisko Lyophyllum decastes na Pomorzu Zachodnim](https://kp.org.pl/pdf/pp/pdf2/pp_nr%202-2017_3_bocian.pdf). Regionalne potwierdzenie kępkowca; nie krajowy model produktywności.
- **S28**: [Lasy Państwowe, Nadleśnictwo Skwierzyna — złotoborowik wysmukły](https://skwierzyna.szczecin.lasy.gov.pl/de/aktualnosci/-/asset_publisher/1M8a/content/zlotak-wynios-1). Nazewnictwo, związek z sosnami i ekspansja gatunku obcego.
- **S29**: [NCBI Taxonomy — Infundibulicybe geotropa](https://www.ncbi.nlm.nih.gov/Taxonomy/Browser/wwwtax.cgi?id=230767&mode=Info). Synonim Clitocybe geotropa; rejestry mogą przyjmować odmienne ujęcia.
- **S30**: [Bezpieczne grzybobranie — materiał inspekcji sanitarnej](https://www.gov.pl/attachment/5bffa626-3bd3-4f99-8b5f-40d2961472cb). Zielonka: historyczna jadalność zestawiona z ostrzeżeniem przed zatruciami.
