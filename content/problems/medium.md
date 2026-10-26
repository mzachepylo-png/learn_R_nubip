# Задачі середнього рівня
> Кілька кроків, цикли та функції.

## Завдання: Штати за кількістю вбивств [medium]
@topic Аналіз даних
У наборі `USArrests` стовпець `Murder` — кількість арештів за вбивство на 100 000 населення. Знайдіть назви трьох штатів із найбільшим значенням (від більшого до меншого) — вектор `top3`.
```r starter
# top3 <- ...

```
```r solution
top3 <- rownames(USArrests)[order(-USArrests$Murder)[1:3]]
```
@hint Використайте `order()` та імена рядків `rownames()`.
@check vars=top3

## Завдання: Рейтинг видів ірисів [medium]
@topic Аналіз даних
Обчисліть середню довжину пелюстки `Petal.Length` для кожного виду в `iris` та впорядкуйте результат за **спаданням** — іменований вектор `ranked`.
```r starter
# ranked <- ...

```
```r solution
ranked <- sort(tapply(iris$Petal.Length, iris$Species, mean), decreasing = TRUE)
```
@hint `tapply()` дає середні за групами, `sort(decreasing = TRUE)` — впорядковує.
@check vars=ranked

## Завдання: Тонни з тексту [medium]
@topic Очищення даних
Обсяги зібраного зерна записано текстом з одиницями та десятковою комою. Перетворіть їх на числовий вектор `tons`.
```r setup
raw <- c("12,5 т", "8 т", "15,25 т", " 3,75т")
```
```r starter
# tons <- ...

```
```r solution
tons <- as.numeric(gsub(",", ".", gsub("[^0-9,]", "", raw)))
```
@hint Спочатку залиште лише цифри й кому (`gsub("[^0-9,]", "", ...)`), потім замініть кому на крапку.
@check vars=tons

## Завдання: Найсильніша кореляція [medium]
@topic Статистика
Серед усіх інших змінних `mtcars` знайдіть ту, яка має найбільший за модулем коефіцієнт кореляції з `mpg`. Збережіть її **назву** в `best`.
```r starter
# best <- ...

```
```r solution
cm <- cor(mtcars)["mpg", ]
best <- names(which.max(abs(cm[names(cm) != "mpg"])))
```
@hint `cor(mtcars)` дає матрицю; нас цікавить рядок `"mpg"` без самого себе.
@check vars=best

## Завдання: Перше велике число Фібоначчі [medium]
@topic Алгоритми
Числа Фібоначчі: `F₁ = 1, F₂ = 1, Fₙ = Fₙ₋₁ + Fₙ₋₂`. Знайдіть номер `n_fib` першого числа, яке **перевищує 10 000**.
```r starter
# n_fib <- ...

```
```r solution
a <- 1
b <- 1
n_fib <- 2
while (b <= 10000) {
  tmp <- a + b
  a <- b
  b <- tmp
  n_fib <- n_fib + 1
}
```
@hint Тримайте в циклі два останні числа та лічильник номера.
@check vars=n_fib

## Завдання: Площа еліпса [medium]
@topic Моделювання
Оцініть методом Монте-Карло площу еліпса `x²/4 + y² ≤ 1` (точна площа `2π ≈ 6.283`). Генеруйте 100 000 точок у прямокутнику `[−2, 2] × [−1, 1]` (площа 8), `set.seed(1)`. Результат — `area`.
```r starter
# set.seed(1)
# n <- 100000
# area <- ...

```
```r solution
set.seed(1)
n <- 100000
x <- runif(n, -2, 2)
y <- runif(n, -1, 1)
area <- 8 * mean(x^2 / 4 + y^2 <= 1)
```
@hint Площа ≈ площа прямокутника × частка точок усередині еліпса.
@check uses=runif
@test exists("area") && abs(area - 2 * pi) < 0.1 => Площа має бути близькою до 2π ≈ 6.283.

## Завдання: Сортування бульбашкою [medium]
@topic Алгоритми
Реалізуйте функцію `bubble(x)`, що сортує числовий вектор за зростанням методом бульбашки (без `sort` та `order`).
```r starter
# bubble <- function(x) {
#
# }

```
```r solution
bubble <- function(x) {
  n <- length(x)
  if (n < 2) return(x)
  for (i in 1:(n - 1)) {
    for (j in 1:(n - i)) {
      if (x[j] > x[j + 1]) {
        tmp <- x[j]
        x[j] <- x[j + 1]
        x[j + 1] <- tmp
      }
    }
  }
  x
}
```
@hint Два вкладених цикли: порівнюйте сусідні елементи й міняйте їх місцями.
@check avoid=sort,order
@test is.function(bubble) && identical(bubble(c(5, 2, 9, 1, 5, 6)), c(1, 2, 5, 5, 6, 9)) && identical(bubble(c(3)), c(3)) && identical(bubble(c(2, 1)), c(1, 2)) => Результат має бути відсортованим: bubble(c(5, 2, 9, 1, 5, 6)) = 1 2 5 5 6 9.
@test is.function(bubble) && { set.seed(2); v <- sample(100, 30); identical(bubble(v), sort(v)) } => Перевірка на випадковому векторі не пройдена.

## Завдання: Платіж за кредитом [medium]
@topic Моделювання
Щомісячний платіж за кредитом `L` під річну ставку `r` на `years` років: `P = L·i / (1 − (1 + i)^(−n))`, де `i = r/12`, `n = 12·years`. Напишіть функцію `payment(L, r, years)`.
```r starter
# payment <- function(L, r, years) {
#
# }

```
```r solution
payment <- function(L, r, years) {
  i <- r / 12
  n <- 12 * years
  L * i / (1 - (1 + i)^(-n))
}
```
@hint Спершу місячна ставка `i` і кількість платежів `n`.
@check uses=function
@test is.function(payment) && abs(payment(100000, 0.06, 20) - 716.431) < 0.01 => payment(100000, 0.06, 20) має бути ≈ 716.43.
@test is.function(payment) && abs(payment(50000, 0.12, 5) - 1112.222) < 0.01 => payment(50000, 0.12, 5) має бути ≈ 1112.22.

## Завдання: Вінзоризація [medium]
@topic Очищення даних
Напишіть функцію `winsor(x, p = 0.05)`, що замінює значення нижче `p`-квантиля на сам цей квантиль, а вище `(1 − p)`-квантиля — на відповідний квантиль (обмеження викидів).
```r starter
# winsor <- function(x, p = 0.05) {
#
# }

```
```r solution
winsor <- function(x, p = 0.05) {
  q <- quantile(x, c(p, 1 - p), names = FALSE)
  pmin(pmax(x, q[1]), q[2])
}
```
@hint `pmax` і `pmin` обмежують значення знизу та зверху поелементно.
@check uses=function
@test is.function(winsor) && { x <- c(1, 2, 3, 4, 5, 6, 7, 8, 9, 100); w <- winsor(x, 0.1); isTRUE(all.equal(w, pmin(pmax(x, quantile(x, 0.1)), quantile(x, 0.9)), check.attributes = FALSE)) } => winsor(c(1:9, 100), 0.1) має обмежити значення квантилями 10 % та 90 %.
@test is.function(winsor) && max(winsor(c(1:20, 1000))) < 1000 && length(winsor(1:50)) == 50 => Екстремальне значення має бути обмежене, а довжина вектора збережена.

## Завдання: Таблиця середніх [medium]
@topic Аналіз даних
Для `ToothGrowth` побудуйте матрицю середніх значень `len`: рядки — спосіб введення `supp`, стовпці — доза `dose`. Збережіть у `tab` (функція `tapply` зі списком із двох груп).
```r starter
# tab <- tapply(...)

```
```r solution
tab <- with(ToothGrowth, tapply(len, list(supp, dose), mean))
```
@hint Групувальні змінні передайте як `list(supp, dose)`.
@check vars=tab uses=tapply

## Завдання: Прогноз ваги [medium]
@topic Моделювання
За даними `women` побудуйте лінійну модель `weight ~ height` і передбачте вагу при зрості 70 дюймів. Результат без назви, округлений до 2 знаків, — `w70`.
```r starter
# fit <- lm(...)
# w70 <- ...

```
```r solution
fit <- lm(weight ~ height, data = women)
w70 <- round(unname(predict(fit, data.frame(height = 70))), 2)
```
@hint `predict(fit, data.frame(height = 70))`.
@check vars=w70 uses=lm,predict

## Завдання: Найчастіше слово [medium]
@topic Алгоритми
У тексті `text` знайдіть найчастіше слово (регістр і розділові знаки не враховуйте). Збережіть його в `top_word`.
```r setup
text <- "Дані це нова нафта, але дані потрібно очистити і дані потрібно аналізувати."
```
```r starter
# words <- ...
# top_word <- ...

```
```r solution
words <- strsplit(gsub("[[:punct:]]", "", tolower(text)), "\\s+")[[1]]
top_word <- names(which.max(table(words)))
```
@hint Видаліть розділові знаки `gsub("[[:punct:]]", "", ...)`, розбийте за пробілами `strsplit(..., "\\s+")`.
@check vars=top_word
