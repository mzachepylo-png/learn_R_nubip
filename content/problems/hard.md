# Складні задачі
> Власні алгоритми, моделі та повні конвеєри обробки даних.

## Завдання: Тест Велча власноруч [hard]
@topic Статистика
Напишіть функцію `welch(x, y)`, яка повертає список із елементами `t` (статистика), `df` (ступені свободи за Уелчем–Саттертвейтом) та `p` (двостороннє p-значення) для порівняння середніх двох вибірок **без** використання `t.test`.

`t = (x̄ − ȳ)/√(sₓ²/nₓ + s_y²/n_y)`, `df = (a + b)² / (a²/(nₓ−1) + b²/(n_y−1))`, де `a = sₓ²/nₓ`, `b = s_y²/n_y`.
```r starter
# welch <- function(x, y) {
#
# }

```
```r solution
welch <- function(x, y) {
  nx <- length(x)
  ny <- length(y)
  a <- var(x) / nx
  b <- var(y) / ny
  t <- (mean(x) - mean(y)) / sqrt(a + b)
  df <- (a + b)^2 / (a^2 / (nx - 1) + b^2 / (ny - 1))
  p <- 2 * pt(-abs(t), df)
  list(t = t, df = df, p = p)
}
```
@hint Двостороннє p-значення: `2 * pt(-abs(t), df)`.
@check avoid=t.test
@test is.function(welch) && { x <- mtcars$mpg[mtcars$am == 1]; y <- mtcars$mpg[mtcars$am == 0]; r <- welch(x, y); tt <- t.test(x, y); isTRUE(all.equal(r$t, unname(tt$statistic))) && isTRUE(all.equal(r$df, unname(tt$parameter))) && isTRUE(all.equal(r$p, tt$p.value)) } => Результат має збігатися з t.test(x, y) для mpg за коробкою передач (t ≈ 3.77, df ≈ 18.3, p ≈ 0.0014).
@test is.function(welch) && { r <- welch(c(5.1, 5.4, 4.9, 5.8), c(6.3, 6.8, 6.1, 7.0, 6.6)); isTRUE(all.equal(r$p, t.test(c(5.1, 5.4, 4.9, 5.8), c(6.3, 6.8, 6.1, 7.0, 6.6))$p.value)) } => Перевірка на невеликих вибірках різної довжини не пройдена.

## Завдання: Кінетика Міхаеліса–Ментен [hard]
@topic Моделювання
У наборі `Puromycin` швидкість ферментативної реакції `rate` залежить від концентрації субстрату `conc`. Для **оброблених** зразків (`state == "treated"`) підберіть модель `rate = Vm·conc / (K + conc)` функцією `nls` з початковими значеннями `Vm = 200`, `K = 0.05`. Збережіть модель у `fit`.
```r starter
# treated <- subset(Puromycin, state == "treated")
# fit <- nls(...)

```
```r solution
treated <- subset(Puromycin, state == "treated")
fit <- nls(rate ~ Vm * conc / (K + conc), data = treated, start = list(Vm = 200, K = 0.05))
```
@hint Формула: `rate ~ Vm * conc / (K + conc)`, дані — `data = treated`.
@check uses=nls
@test inherits(fit, "nls") && abs(coef(fit)[["Vm"]] - 212.68) < 2 && abs(coef(fit)[["K"]] - 0.0641) < 0.005 => Очікувані параметри: Vm ≈ 212.7, K ≈ 0.064.

## Завдання: Поріг вакцинації [hard]
@topic Моделювання
Функція `sir_peak(v)` (уже задана) повертає **пік кількості інфікованих** у моделі SIR (β = 0.3, γ = 0.1, N = 1000), якщо частка `v` населення вакцинована (має імунітет). Знайдіть найменшу частку `v_min` із сітки `v_grid = seq(0, 0.9, by = 0.01)`, при якій пік не перевищує 50 осіб (`< 50`).
```r setup
sir_peak <- function(v, beta = 0.3, gamma = 0.1, N = 1000, days = 300) {
  S <- (1 - v) * (N - 1)
  I <- 1
  peak <- I
  for (t in 1:days) {
    new_inf <- beta * S * I / N
    rec <- gamma * I
    S <- S - new_inf
    I <- I + new_inf - rec
    peak <- max(peak, I)
  }
  peak
}
v_grid <- seq(0, 0.9, by = 0.01)
```
```r starter
# peaks <- sapply(v_grid, sir_peak)
# v_min <- ...

```
```r solution
peaks <- sapply(v_grid, sir_peak)
v_min <- v_grid[which(peaks < 50)[1]]
```
@hint Обчисліть пік для всієї сітки (`sapply`) і знайдіть перший індекс, де `peaks < 50`.
@check vars=v_min

## Завдання: Ферзі на дошці [hard]
@topic Алгоритми
Напишіть функцію `queens(n)`, яка повертає кількість способів розставити `n` ферзів на дошці `n × n` так, щоб жодні два не били один одного (пошук з поверненням).
```r starter
# queens <- function(n) {
#
# }

```
```r solution
queens <- function(n) {
  count <- 0
  place <- function(row, cols) {
    if (row > n) {
      count <<- count + 1
      return(invisible())
    }
    for (c in 1:n) {
      ok <- TRUE
      for (r in seq_len(row - 1)) {
        if (cols[r] == c || abs(cols[r] - c) == row - r) {
          ok <- FALSE
          break
        }
      }
      if (ok) place(row + 1, c(cols, c))
    }
  }
  place(1, integer(0))
  count
}
```
@hint Розставляйте ферзів по рядках; для кожного рядка пробуйте стовпці, що не під боєм попередніх.
@hint Атака по діагоналі: `abs(стовпець_1 − стовпець_2) == різниця_рядків`.
@check uses=function
@test is.function(queens) && queens(4) == 2 && queens(5) == 10 && queens(6) == 4 => queens(4) = 2, queens(5) = 10, queens(6) = 4.
@test is.function(queens) && queens(8) == 92 => Для дошки 8 × 8 існує 92 розв'язки.

## Завдання: Найкоротший шлях [hard]
@topic Алгоритми
Орієнтований зважений граф задано матрицею ваг `W` (`Inf` — ребра немає, діагональ 0). Напишіть функцію `shortest(W, from, to)` — довжину найкоротшого шляху (алгоритм Дейкстри).
```r setup
W <- matrix(Inf, 5, 5)
diag(W) <- 0
W[1, 2] <- 4
W[1, 3] <- 1
W[3, 2] <- 2
W[2, 4] <- 1
W[3, 4] <- 5
W[4, 5] <- 3
```
```r starter
# shortest <- function(W, from, to) {
#
# }

```
```r solution
shortest <- function(W, from, to) {
  n <- nrow(W)
  dist <- rep(Inf, n)
  dist[from] <- 0
  done <- rep(FALSE, n)
  repeat {
    cand <- which(!done & is.finite(dist))
    if (length(cand) == 0) break
    u <- cand[which.min(dist[cand])]
    done[u] <- TRUE
    for (v in 1:n) {
      if (W[u, v] < Inf && dist[u] + W[u, v] < dist[v]) dist[v] <- dist[u] + W[u, v]
    }
  }
  dist[to]
}
```
@hint Тримайте вектор відстаней і множину оброблених вершин; на кожному кроці беріть необроблену вершину з мінімальною відстанню.
@check uses=function
@test is.function(shortest) && shortest(W, 1, 4) == 4 && shortest(W, 1, 5) == 7 && shortest(W, 1, 2) == 3 => Очікується: 1→4 = 4, 1→5 = 7, 1→2 = 3.
@test is.function(shortest) && shortest(W, 5, 1) == Inf && shortest(W, 2, 2) == 0 => Недосяжна вершина дає Inf, відстань до себе — 0.

## Завдання: k-блочна перехресна перевірка [hard]
@topic Статистика
Напишіть функцію `cv_rmse(formula, data, k = 5, seed = 1)`, що повертає RMSE лінійної моделі за k-блочною перехресною перевіркою. Порядок дій (повинен збігатися точно): `set.seed(seed)`; `fold <- sample(rep(1:k, length.out = nrow(data)))`; для кожного блоку `i` модель навчається на рядках, де `fold != i`, прогнозується для `fold == i`; RMSE — корінь із середнього квадрата **усіх** помилок прогнозу. Відгук — перша змінна у формулі.
```r starter
# cv_rmse <- function(formula, data, k = 5, seed = 1) {
#
# }

```
```r solution
cv_rmse <- function(formula, data, k = 5, seed = 1) {
  set.seed(seed)
  fold <- sample(rep(1:k, length.out = nrow(data)))
  y <- data[[all.vars(formula)[1]]]
  err <- numeric(nrow(data))
  for (i in 1:k) {
    fit <- lm(formula, data = data[fold != i, ])
    err[fold == i] <- y[fold == i] - predict(fit, data[fold == i, ])
  }
  sqrt(mean(err^2))
}
```
@hint Відгук: `data[[all.vars(formula)[1]]]`.
@check uses=function
@test is.function(cv_rmse) && isTRUE(all.equal(cv_rmse(mpg ~ wt, mtcars), .sol$cv_rmse(mpg ~ wt, mtcars))) => cv_rmse(mpg ~ wt, mtcars) не збігається з очікуваним (≈ 3.1).
@test is.function(cv_rmse) && isTRUE(all.equal(cv_rmse(dist ~ speed, cars, k = 10, seed = 2), .sol$cv_rmse(dist ~ speed, cars, k = 10, seed = 2))) => Перевірка з k = 10 та seed = 2 не пройдена.

## Завдання: Гребенева регресія [hard]
@topic Моделювання
Напишіть функцію `ridge(X, y, lambda)`, що повертає **числовий вектор** оцінок гребеневої регресії `β = (XᵀX + λI)⁻¹ Xᵀy` (штрафуються всі коефіцієнти).
```r starter
# ridge <- function(X, y, lambda) {
#
# }

```
```r solution
ridge <- function(X, y, lambda) {
  as.vector(solve(t(X) %*% X + lambda * diag(ncol(X)), t(X) %*% y))
}
```
@hint `solve(t(X) %*% X + lambda * diag(ncol(X)), t(X) %*% y)`.
@check uses=function,solve
@test is.function(ridge) && { X <- cbind(1, mtcars$wt, mtcars$hp); y <- mtcars$mpg; isTRUE(all.equal(ridge(X, y, 0), unname(coef(lm(y ~ X - 1))), tolerance = 1e-6)) } => При λ = 0 результат має збігатися зі звичайним МНК.
@test is.function(ridge) && { X <- cbind(1, mtcars$wt, mtcars$hp); y <- mtcars$mpg; b <- ridge(X, y, 5); is.numeric(b) && is.null(dim(b)) && length(b) == 3 && isTRUE(all.equal(b, as.vector(solve(t(X) %*% X + 5 * diag(3)) %*% t(X) %*% y))) } => ridge має повертати вектор довжини 3; перевірте формулу.

## Завдання: k-середніх з нуля [hard]
@topic Моделювання
Реалізуйте алгоритм Ллойда: функція `kmeans_lloyd(x, centers, iters = 20)` приймає матрицю даних `x` та матрицю початкових центрів, на кожній ітерації відносить кожну точку до найближчого центру (евклідова відстань) і перераховує центри як середні. Повертає вектор номерів кластерів для останнього призначення. Використовувати `kmeans()` не можна.
```r starter
# kmeans_lloyd <- function(x, centers, iters = 20) {
#
# }

```
```r solution
kmeans_lloyd <- function(x, centers, iters = 20) {
  k <- nrow(centers)
  cl <- integer(nrow(x))
  for (it in 1:iters) {
    d <- sapply(1:k, function(j) rowSums((x - matrix(centers[j, ], nrow(x), ncol(x), byrow = TRUE))^2))
    cl <- max.col(-d, ties.method = "first")
    for (j in 1:k) centers[j, ] <- colMeans(x[cl == j, , drop = FALSE])
  }
  cl
}
```
@hint Відстані до кожного центру складіть у матрицю `n × k`, найближчий центр — `max.col(-d)`.
@check avoid=kmeans
@test is.function(kmeans_lloyd) && { x <- as.matrix(iris[, 3:4]); init <- x[c(1, 51, 101), ]; cl <- kmeans_lloyd(x, init); identical(as.integer(cl), as.integer(.sol$kmeans_lloyd(x, init))) } => Для iris[, 3:4] із початковими центрами з рядків 1, 51, 101 кластери не збігаються з очікуваними.
@test is.function(kmeans_lloyd) && { x <- as.matrix(iris[, 3:4]); cl <- kmeans_lloyd(x, x[c(1, 51, 101), ]); length(cl) == 150 && all(table(cl) > 40) } => Має вийти три кластери по ~50 точок.

## Завдання: Метод Рунге–Кутта для систем [hard]
@topic Моделювання
Напишіть функцію `rk4_sys(f, y0, h, n)` для систем `y′ = f(y)`, де `y0` — вектор початкових значень, а `f` повертає вектор похідних. Функція повертає матрицю з `n + 1` рядків (по рядку на момент часу) і `length(y0)` стовпців.
```r setup
f_lv <- function(y) c(1 * y[1] - 0.1 * y[1] * y[2], -1.5 * y[2] + 0.075 * y[1] * y[2])
```
```r starter
# rk4_sys <- function(f, y0, h, n) {
#
# }

```
```r solution
rk4_sys <- function(f, y0, h, n) {
  out <- matrix(0, n + 1, length(y0))
  out[1, ] <- y0
  y <- y0
  for (i in 1:n) {
    k1 <- f(y)
    k2 <- f(y + h / 2 * k1)
    k3 <- f(y + h / 2 * k2)
    k4 <- f(y + h * k3)
    y <- y + h / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
    out[i + 1, ] <- y
  }
  out
}
```
@hint Це той самий RK4, але стан `y` — вектор, тож усі `k` теж вектори.
@check uses=function
@test is.function(rk4_sys) && is.matrix(rk4_sys(f_lv, c(10, 5), 0.01, 50)) && all(dim(rk4_sys(f_lv, c(10, 5), 0.01, 50)) == c(51, 2)) => Результат має бути матрицею (n + 1) × length(y0).
@test is.function(rk4_sys) && abs(rk4_sys(function(y) -y, 1, 0.1, 10)[11, 1] - exp(-1)) < 1e-5 => Для y′ = −y значення при t = 1 має бути ≈ e⁻¹.
@test is.function(rk4_sys) && isTRUE(all.equal(rk4_sys(f_lv, c(10, 5), 0.01, 500), .sol$rk4_sys(f_lv, c(10, 5), 0.01, 500), tolerance = 1e-8)) => Траєкторія Лотки–Вольтерра не збігається з очікуваною.

## Завдання: Bootstrap кореляції [hard]
@topic Статистика
Напишіть функцію `boot_cor(x, y, B = 2000, seed = 1)`, що повертає числовий вектор із нижньої та верхньої меж 95 % перцентильного bootstrap-інтервалу для коефіцієнта кореляції Пірсона. У кожному з `B` повторів індекси беруться як `sample(n, replace = TRUE)` після `set.seed(seed)`.
```r starter
# boot_cor <- function(x, y, B = 2000, seed = 1) {
#
# }

```
```r solution
boot_cor <- function(x, y, B = 2000, seed = 1) {
  set.seed(seed)
  n <- length(x)
  r <- replicate(B, {
    i <- sample(n, replace = TRUE)
    cor(x[i], y[i])
  })
  unname(quantile(r, c(0.025, 0.975)))
}
```
@hint Усередині `replicate` оберіть індекси `i` та порахуйте `cor(x[i], y[i])`.
@check uses=function,replicate
@test is.function(boot_cor) && { ci <- boot_cor(mtcars$wt, mtcars$mpg); is.numeric(ci) && length(ci) == 2 && ci[1] < cor(mtcars$wt, mtcars$mpg) && ci[2] > cor(mtcars$wt, mtcars$mpg) } => Інтервал має складатися з двох чисел і містити вибіркову кореляцію.
@test is.function(boot_cor) && { ci <- boot_cor(mtcars$wt, mtcars$mpg); s <- .sol$boot_cor(mtcars$wt, mtcars$mpg); all(abs(ci - s) < 0.03) } => Межі інтервалу мають бути близькими до очікуваних (приблизно −0.93 та −0.78).

## Завдання: Гра «Життя» [hard]
@topic Алгоритми
Напишіть функцію `life_step(M)`, що виконує один крок клітинного автомата Конвея на матриці `M` з нулів (мертві) та одиниць (живі). Клітини за межами матриці вважаються мертвими. Правила: жива клітина з 2–3 живими сусідами виживає, інакше помирає; мертва з рівно 3 живими сусідами оживає. Результат — числова матриця тих самих розмірів.
```r starter
# life_step <- function(M) {
#
# }

```
```r solution
life_step <- function(M) {
  n <- nrow(M)
  m <- ncol(M)
  N <- matrix(0, n, m)
  for (di in -1:1) {
    for (dj in -1:1) {
      if (di == 0 && dj == 0) next
      rows <- 1:n
      cols <- 1:m
      ri <- rows + di
      cj <- cols + dj
      ok_r <- ri >= 1 & ri <= n
      ok_c <- cj >= 1 & cj <= m
      N[rows[ok_r], cols[ok_c]] <- N[rows[ok_r], cols[ok_c]] + M[ri[ok_r], cj[ok_c]]
    }
  }
  1 * ((M == 1 & (N == 2 | N == 3)) | (M == 0 & N == 3))
}
```
@hint Підрахуйте суму 8 «зсунутих» копій матриці (або вкладені цикли по сусідах).
@hint Не забудьте про краї матриці.
@check uses=function
@test is.function(life_step) && { B <- matrix(0, 5, 5); B[3, 2:4] <- 1; R <- matrix(0, 5, 5); R[2:4, 3] <- 1; isTRUE(all.equal(unname(life_step(B)), R)) && isTRUE(all.equal(unname(life_step(R)), B)) } => «Блінкер» (три клітини в рядок) має перетворюватися на вертикальну лінію й назад.
@test is.function(life_step) && { S <- matrix(0, 4, 4); S[2:3, 2:3] <- 1; isTRUE(all.equal(unname(life_step(S)), S)) } => «Блок» 2 × 2 — стійка фігура.
@test is.function(life_step) && { G <- matrix(0, 6, 6); G[1, 2] <- G[2, 3] <- G[3, 1] <- G[3, 2] <- G[3, 3] <- 1; for (i in 1:4) G <- life_step(G); H <- matrix(0, 6, 6); H[2, 3] <- H[3, 4] <- H[4, 2] <- H[4, 3] <- H[4, 4] <- 1; isTRUE(all.equal(unname(G), H)) } => «Планер» за 4 кроки має зсунутися на одну клітинку вниз-вправо.

## Завдання: Повний конвеєр очищення [hard]
@topic Очищення даних
Дані про врожайність у форматі CSV (роздільник `;`, десяткова кома, `-` — пропуск) записано в `csv`. Побудуйте дата-фрейм `report` зі стовпцями `field` (текст), `mean_yield` (середнє, округлене до 2 знаків) та `n` (кількість спостережень) для кожного поля за правилами:

1. прочитайте дані (`read.csv2`, `-` → `NA`);
2. приберіть **повні дублікати** рядків;
3. приберіть рядки з пропущеною врожайністю;
4. приберіть викиди: врожайність, що більша за **3 медіани** решти даних (медіана за всіма полями);
5. згрупуйте за полем (за алфавітом).
```r setup
csv <- "поле;культура;урожайність
A;пшениця;5,4
A;пшениця;5,8
A;пшениця;-
B;пшениця;6,1
B;пшениця;6,3
B;пшениця;6,3
B;пшениця;45,0
C;пшениця;4,9
C;пшениця;5,1"
```
```r starter
# d <- read.csv2(...)
# report <- data.frame(...)

```
```r solution
d <- read.csv2(text = csv, na.strings = "-")
d <- d[!duplicated(d), ]
d <- d[!is.na(d$урожайність), ]
d <- d[d$урожайність <= 3 * median(d$урожайність), ]
g <- split(d$урожайність, d$поле)
report <- data.frame(
  field = names(g),
  mean_yield = round(sapply(g, mean), 2),
  n = sapply(g, length),
  row.names = NULL
)
```
@hint Дублікати: `d[!duplicated(d), ]`. Медіану для викидів обчислюйте після видалення `NA` та дублікатів.
@hint Для групування зручні `split()` та `sapply()`.
@check
@test is.data.frame(report) && identical(names(report), c("field", "mean_yield", "n")) => Дата-фрейм має мати стовпці field, mean_yield, n.
@test is.data.frame(report) && identical(as.character(report$field), c("A", "B", "C")) && isTRUE(all.equal(as.numeric(report$mean_yield), c(5.6, 6.2, 5.0))) && all(report$n == 2) => Очікується: A — 5.6, B — 6.2, C — 5.0, по 2 спостереження (викид 45 і дублікат прибрано).
