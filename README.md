# Flopper API 😼

## Czym jest? 🤔

Jest to REST API stworzone przy pomocy [Node.js](https://nodejs.org/en) oraz [Express.js](https://expressjs.com/) dla serwisu społecznościowego [Flopper](https://flopper-client.vercel.app/), dostępne na bezpośrednie zapytania również [tutaj](https://flopper-api-h23g.onrender.com). Część funkcjonalności API nie została wykorzystana w części frontend.

**W celu szybkiego doświadczenia wszystkich interakcji można zalogować się na konto o id: _gosc_ i haśle: _gosc_**

Jako że do hostingu wykorzystywany jest darmowy plan na [Renderze](https://render.com/), **interfejs po dłuższym czasie nieaktywności przechodzi w stan uśpienia, a jego następne użycie poprzedzone jest chwilą na rozruch**.

API wykonuje zapytania do bazy danych hostowanej dzięki [MongoDB Atlas](https://www.mongodb.com/atlas/database).

Interfejs zawiera również system zarządzania multimediami umieszczanymi przez użytkowników.

## Zawartość interfejsu 📖

### Uwierzytelnianie ❓
- Istnieje możliwość rejestracji konta oraz logowania do serwisu przy użyciu unikalnego identyfikatora i hasła.
- Użytkownik otrzymuje wtedy [JSON Web Token (JWT)](https://jwt.io/), dzięki któremu odbywa się dalsze uwierzytelnianie.
<hr />

### Użytkownicy 👨👩
- Użytkownik przedstawiany jest za pomocą swojego unikalnego identyfikatora i pełnej nazwy, oraz opcjonalnego zdjęcia profilowego, opisu, liczby obserwujących i obserwowanych.
- Pełna nazwa użytkownika, zdjęcie profilowe lub opis mogą być nadpisane w każdym momencie.
- Może on zostać odszukany po identyfikatorze, nazwie lub linku z identyfikatorem.
<hr />

### Znajomi 🤝
- Użytkownicy mogą zapraszać innych do znajomych, akceptować lub odrzucać zaproszenia, bądź usuwać znajomych.
- Znajomi mogą m. in. wyświetlać informacje o czasie ostatniego logowania drugiego użytkownika.
<hr />

### Obserwowani 👀
- Możliwe jest zaobserwowanie profilu innego użytkownika, dzięki któremu nowe posty tego użytkownika będą pojawiać się na stronie głównej użytkownika obserwującego wraz z jego postami i postami innych zaobserwowanych.
<hr />

### Posty 📑
- Każdy użytkownik może zamieścić post, widoczny na stronie jego profilu oraz stronie głównej innych użytkowników, którzy go obserwują.
- Post zawiera jego autora, datę utworzenia, może zawierać tekst, załączniki takie jak obrazy, gify, wideo, czy odtwarzacze [Spotify](https://open.spotify.com/) z wybranym przez użytkownika utworem.
- Post można polubić, udostępnić za pomocą linku, skomentować oraz usunąć na życzenie autora.
- Pobieranie postów proponowanych dla danego użytkownika powinno odbywać się asynchronicznie, zgodnie z potrzebami wyświetlenia.
<hr />

### Komentarze 🗣️
- Komentarz można pozostawić pod postem użytkownika, bądź pod innym komentarzem w celu odpowiedzi.
- Komentarz również można polubić.
- Pobieranie komentarzy pod postem powinno odbywać się asynchronicznie, zgodnie z potrzebami wyświetlenia.
<hr />

### Grupy społecznościowe 👪
- Każdy użytkownik może stworzyć grupę społecznościową opisaną nazwą i liczbą członków, oraz opcjonalnie zdjęciem profilowym i krótkim tekstem.
- Nazwa grupy, zdjęcie profilowe lub opis mogą być nadpisane w każdym momencie.
- Grupy można odszukać po nazwie lub linku z identyfikatorem.
- Użytkownik, który jest administratorem grupy decyduje o członkostwie innych użytkowników, akceptując, bądź odrzucając ich prośby o dołączenie, zapraszając lub ich wyrzucając.
- Grupę można opuścić lub całkowicie usunąć.

## Informacje końcowe ➡️
Jest to mój pierwszy "większy" projekt z użyciem tych technologii, został stworzony na potrzeby projektu szkolnego. Jestem pewny, że niektóre problemy dałoby się rozwiązać w inny, być może lepszy sposób, chętnie wysłucham wszelkich sugestii!
