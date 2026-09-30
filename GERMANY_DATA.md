# Dane niemieckiej mapy

Rozszerzenie zachowuje polski interfejs i automatyczne przełączanie kraju po wybraniu adresu. Granice lasów pochodzą z OpenStreetMap. Moduł `germany_sources_v253.js` dodaje poniższe źródła.

## Drzewa: DLR/EOC

[Tree Species Germany 2022](https://geoservice.dlr.de/web/datasets/treespecies_de_2022), DOI 10.15489/smh8w3j8i962, CC BY 4.0. Klasyfikacja satelitarna przedstawia dominujące grupy drzew w 2022 roku; rozdzielczość źródła wynosi 10 m.

Mapa pobiera GeoTIFF przez WCS i próbkuje go wewnątrz granic lasu, z uwzględnieniem otworów w poligonach. Siatka pobierania jest zwykle około 20 m, a przy większym promieniu jest rzadsza. Szczegóły miejsca pokazują rzeczywisty krok próbkowania. Georeferencja pochodzi z metadanych TIFF, ponieważ zasięg odpowiedzi może różnić się od żądanego.

Udziały odnoszą się do wszystkich badanych próbek, także tych bez rozpoznanych drzew. Klasa 0 oznacza sosnę; 666 oznacza utratę koron, a 999 brak danych. Te dwie ostatnie klasy nie stają się gatunkami drzew. Klasa „inne drzewa” nie otrzymuje wymyślonego gatunku gospodarza.

Profil wymaga co najmniej trzech rozpoznanych próbek i 20% pokrycia. Do dopasowania grzybów trafiają rozpoznane grupy mające co najmniej trzy próbki i 3% udziału. Wiek pozostaje nieznany. Wynik opisuje próbki dominujących koron, a nie pełny skład drzewostanu ani aktualną inwentaryzację.

## Ochrona: BfN

[Schutzgebiete Deutschlands](https://www.bfn.de/daten-und-fakten/kartenanwendung-schutzgebiete-deutschland), Bundesamt für Naturschutz. Pobierane są warstwy Naturschutzgebiete i Nationalparke z publicznego WFS. Atrybucja znajduje się także w szczegółach miejsca. Przy dalszym wykorzystaniu obowiązują warunki źródła; metadane usługi odsyłają do GeonutzV.

WFS 2.0 wymaga bbox w kolejności szerokość/długość geograficzna dla EPSG:4326, natomiast odpowiedź GEOJSON zawiera długość/szerokość. Moduł sprawdza geometrię, obsługuje stronicowanie i usuwa duplikaty.

Przecięcie granic, zawieranie i otwory są uwzględniane. Jeśli choć część obszaru OSM przecina rezerwat lub park narodowy, cały ten obszar jest pomijany w rekomendacjach. To ostrożny filtr rekomendacji; granica obszaru chronionego sama nie rozstrzyga lokalnych zasad zbioru. Brak przecięcia nie potwierdza dostępności terenu. Nie wszystkie rodzaje ochrony są objęte tym filtrem.

## Siedlisko: NIBIS / LBEG FORST25

[Mapa FORST25](https://nibis.lbeg.de/cardomap3/?TH=618), [opis źródła](https://nibis.lbeg.de/net3/public/ikxcms/?pgid=46), [warunki użycia](https://www.lbeg.niedersachsen.de/download/52790/Nutzungsbedingungen_fuer_die_Geodaten-Dienste.pdf).

Po otwarciu szczegółów lasu aplikacja odpytuje publiczny WMS GetFeatureInfo o punkt wewnątrz jego geometrii. Źródło obejmuje wybrane lasy Dolnej Saksonii. Odpowiedź w EPSG:4647 jest przeliczana przez proj4; wybierane są tylko działki rzeczywiście zawierające punkt.

Opis wilgotności, zasobności i podłoża pozostaje w oryginalnym niemieckim brzmieniu, przy polskich etykietach. Dotyczy wskazanego punktu, nie całego lasu. Nie zastępuje pomiarów pH i nie zmienia punktacji całego obszaru.

Źródło nie jest oznaczone jako CC BY. Warunki LBEG wymagają atrybucji, a komercyjna publikacja map wymaga zgody zgodnie z podlinkowanymi warunkami. Obecna zmiana jest lokalna; nie opublikowano aplikacji. Nie pobieramy hurtowej surowej bazy FORST25.

## Odporność i ograniczenia

Żądania mają limit 25 sekund i pamięć podręczną na czas sesji. Nieudane odpowiedzi nie pozostają w cache. Niedostępność źródła jest widoczna w stanie danych; nie tworzymy zastępczych danych drzew lub wieku. Dane pogodowe i glebowe nadal korzystają z istniejących dostawców i mogą być okresowo niedostępne.

## Weryfikacja

Testy jednostkowe: `node --test tests/country.test.cjs tests/germany-sources.test.cjs` — 11 testów. Obejmują geokodowanie, geometrię z otworami, przecinające się krawędzie, rzeczywisty TIFF, klasy drzew, transformację NIBIS i ponowienie po błędzie.

Test przeglądarkowy: `node tests/germany-browser.cjs` (wymaga Playwright i Edge). `TEST_FIXTURES=1` włącza zapisane odpowiedzi do powtarzalnego testu. `LIVE_SOURCES_ONLY=1` sprawdza same rzeczywiste usługi niemieckie. Test pełny sprawdza również powrót do Polski i brak wywołań BDL dla Niemiec.

Próba rzeczywistych danych dla Salzgitter, promień 10 km: 525 obszarów leśnych OSM, użyteczne profile DLR dla 92 z nich, 5 oficjalnych obszarów chronionych, brak błędów JavaScript i brak zapytań BDL. Pokrycie DLR nie jest kompletne. Osobny punkt w okolicy Lichtenbergu zwrócił profil z przewagą buka i dębu oraz opis siedliska NIBIS. Są to wyniki próby, nie stałe gwarantowane liczby.
