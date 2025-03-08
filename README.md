# Projekt Car Shop

## Opis

Projekt umożliwia rejestrację, logowanie, zarządzanie użytkownikami i samochodami oraz symulację zakupu samochodów.

## Uruchomienie

1. Skompiluj projekt przy użyciu `tsc` albo komendą: `npm run tsc`.
2. Uruchom serwer (np. `npm run start:nodemon`).
3. Frontend znajduje się w katalogu `frontend/` – dostęp do plików statycznych przez endpoint `/static/`.

## Uwaga

Konto administratora jest predefiniowane w `db/users.json`:

- **Username:** admin
- **Password:** admin123

## Cele zadania

- CRUD dla users (create, read, update, delete)
- CRUD dla cars (create, read, update, delete)
- zapis do bazy danych w formie plików json
- obsługa błędów
- logowanie
- rejestracja
- sprawdzanie roli/permissionów (admin widzi wszystko i może updatować wszystko, user może tylko swoje zasoby)
- serwowanie frontendu z poziomu serwera jako pliki statyczne
- dopieszczenie frontendu
- hack/10000, backdoor do zasilania konta usera (bonus)
- pełne otypowanie
- \*ustawianie ciasteczka (dla chętnych refresh tokena i expire time)
- \*\*SSE - (server side events), w momencie zakupu samochodu wysyłamy info do wszystkich podpiętych userów
