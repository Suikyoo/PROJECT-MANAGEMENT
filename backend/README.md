
## How to start all services:

npm run setup
npm run seed
npm run start

> note that `npm run seed` would block. just wait for a while until there are no results anymore
> seeing something about . undefined should be the key point where you cancel the process

## interfaces:

```
Student {
  id: number,
  name: string,
  //img url
  img: string,
  }
```

## server routes

- **GET**  _"/students"_         :   returns Student[]
- **GET**  _"/students/:id"_     :   returns Student[] //returns either 0 or 1 element   

- **POST** _"/students/auth"_    :   receives form data: (username: string, password: string) returns some status code
- **POST** _"/students/:id"_     :   returns some status code

