## Основи

### Арифметика й математика
Оператори `+ - * / ^`, `%/%` (ціла частина), `%%` (остача).
```r
17 %/% 5; 17 %% 5; 2^10
sqrt(16); exp(1); log(100); log10(1000); log(8, base = 2)
round(3.14159, 2); floor(2.7); ceiling(2.1); abs(-3)
```

### Присвоєння та типи
Присвоєння — `<-`. Типи: `numeric`, `integer`, `character`, `logical`.
```r
x <- 42L
name <- "R"
flag <- TRUE
class(x); class(name); class(flag)
is.numeric(x); as.character(x); as.numeric("3.5")
```

### Порівняння та логіка
```r
5 > 3; 5 == 5; 5 != 4
TRUE & FALSE; TRUE | FALSE; !TRUE
xor(TRUE, FALSE); isTRUE(c(TRUE, TRUE))
c(1, 5, 9) %in% c(5, 6)
```

### Довідка та пошук
```r static
?mean            # довідка про функцію
help("lm")
args(round)      # аргументи функції
example(mean)    # приклади з довідки
apropos("test")  # функції, у назві яких є «test»
```

### Пайп та лямбда
```r
c(1, 4, 9) |> sqrt() |> sum()
sapply(1:5, \(i) i^2)
```

## Вектори

### Створення
```r
c(1, 2, 3)
1:10
seq(0, 1, by = 0.25)
seq(0, 100, length.out = 5)
rep(c("a", "b"), times = 2)
rep(c(1, 2), each = 3)
numeric(3); character(2); logical(2)
```

### Індексація
```r
x <- c(a = 5, b = 8, c = 2, d = 9)
x[2]; x[-1]; x[2:3]; x[c(1, 4)]
x[x > 4]
x["c"]
which(x > 4); which.max(x); which.min(x)
head(x, 2); tail(x, 2)
```

### Статистика вектора
```r
x <- c(5.8, 6.1, 5.4, 6.9, 7.2)
sum(x); mean(x); median(x); sd(x); var(x)
min(x); max(x); range(x); IQR(x)
quantile(x, c(0.25, 0.75)); summary(x)
cumsum(x); diff(x); rev(x)
```

### Сортування та порядок
```r
x <- c(5.8, 6.1, 5.4, 6.9, 7.2)
sort(x); sort(x, decreasing = TRUE)
order(x); rank(x)
x[order(-x)][1:3]
```

### Пропущені значення
```r
x <- c(4, NA, 6)
is.na(x); anyNA(x); sum(is.na(x))
mean(x, na.rm = TRUE)
x[!is.na(x)]
ifelse(is.na(x), 0, x)
```

### Умови над векторами
```r
x <- c(3, 8, 5, 12)
any(x > 10); all(x > 2); sum(x > 4); mean(x > 4)
ifelse(x > 5, "багато", "мало")
cut(x, breaks = c(0, 5, 10, Inf), labels = c("низько", "середньо", "високо"))
```

## Матриці

### Створення й розміри
```r
m <- matrix(1:6, nrow = 2)
matrix(1:6, nrow = 2, byrow = TRUE)
dim(m); nrow(m); ncol(m)
rbind(1:3, 4:6); cbind(1:3, 4:6)
diag(3)
```

### Індексація матриць
```r
m <- matrix(1:12, nrow = 3)
m[2, 3]; m[1, ]; m[, 2]; m[1:2, c(1, 4)]
m[m > 6]
```

### Матрична алгебра
```r
A <- matrix(c(2, 1, 1, 3), 2)
b <- c(5, 10)
A %*% A
t(A); det(A); solve(A)
solve(A, b)
crossprod(A)
eigen(A)$values
outer(1:3, 1:3)
```

### apply та підсумки
```r
m <- matrix(1:6, nrow = 2)
rowSums(m); colSums(m); rowMeans(m); colMeans(m)
apply(m, 1, max)
apply(m, 2, function(col) col / sum(col))
```

## Структури даних

### Списки
```r
l <- list(name = "A", n = 3, v = c(1, 2))
l$name; l[["n"]]; l$v[2]
l$new <- TRUE
l$n <- NULL
names(l); length(l); str(l)
lapply(l, class)
```

### Фактори
```r
f <- factor(c("low", "high", "mid", "low"), levels = c("low", "mid", "high"))
levels(f); table(f); as.integer(f); nlevels(f)
relevel(f, ref = "high")
```

### Створення дата-фрейму
```r
df <- data.frame(id = 1:4, g = c("a", "b", "a", "b"), y = c(5.1, 6.3, 4.8, 7.0))
df
str(df); summary(df); dim(df); names(df)
head(df, 2)
```

### Доступ до дата-фрейму
```r
df <- data.frame(id = 1:4, g = c("a", "b", "a", "b"), y = c(5.1, 6.3, 4.8, 7.0))
df$y; df[["g"]]; df[2, ]; df[, c("id", "y")]; df[df$y > 5, ]
df$z <- df$y * 2
df[order(-df$y), ]
```

### Фільтрація, об'єднання, перетворення
```r
df <- data.frame(id = 1:4, g = c("a", "b", "a", "b"), y = c(5.1, 6.3, 4.8, 7.0))
subset(df, y > 5, select = c(id, y))
transform(df, y2 = y^2)
other <- data.frame(id = c(1, 2, 5), w = c(10, 20, 50))
merge(df, other, by = "id")
merge(df, other, by = "id", all.x = TRUE)
rbind(df, data.frame(id = 5, g = "a", y = 5.5))
unique(df$g); duplicated(c(1, 2, 2))
```

### Групові обчислення
```r
tapply(iris$Sepal.Length, iris$Species, mean)
aggregate(mpg ~ cyl, data = mtcars, FUN = mean)
table(mtcars$cyl, mtcars$gear)
sapply(split(ToothGrowth$len, ToothGrowth$supp), median)
ave(c(4, 6, 10, 12), c("a", "a", "b", "b"))
```

## Програмування

### Умови
```r
x <- 7
if (x > 10) {
  "велике"
} else if (x > 5) {
  "середнє"
} else {
  "мале"
}
switch("b", a = 1, b = 2, 0)
```

### Цикли
```r
for (i in 1:3) print(i^2)
n <- 0
while (n < 3) n <- n + 1
repeat { n <- n + 1; if (n > 5) break }
for (v in c(1, NA, 3)) { if (is.na(v)) next; print(v) }
```

### Функції
```r
sq <- function(x, p = 2) {
  x^p
}
sq(3); sq(3, p = 3)
f <- function(...) sum(...)
f(1, 2, 3)
```

### Функціональне програмування
```r
sapply(1:5, function(i) i^2)
vapply(1:3, function(i) i * 2, numeric(1))
lapply(list(1:3, 4:6), sum)
Filter(function(v) v > 2, 1:5)
Map(function(a, b) a + b, 1:3, 4:6)
Reduce(`+`, 1:5, accumulate = TRUE)
do.call(rbind, list(1:2, 3:4))
```

### Обробка помилок
```r
tryCatch(log(-1), warning = function(w) "попередження")
tryCatch(stop("біда"), error = function(e) conditionMessage(e))
stopifnot(is.numeric(1))
suppressWarnings(as.numeric("a"))
```

## Текст і дати

### Рядки
```r
s <- "Аналіз даних"
nchar(s); toupper(s); tolower(s); substr(s, 1, 6)
paste("a", "b"); paste0("x", 1:3); paste(c("a", "b"), collapse = "+")
sprintf("%.2f; %05d; %s", 3.14159, 42, "текст")
trimws("  ab  ")
```

### Пошук і заміна
```r
x <- c("W-01", "S-02", "W-03")
grepl("^W", x); x[grepl("^W", x)]
sub("-", "_", x); gsub("[0-9]", "#", x)
strsplit("a,b,c", ",")[[1]]
regmatches("a1b22", gregexpr("[0-9]+", "a1b22"))[[1]]
startsWith(x, "W")
```

### Дати
```r
d <- as.Date("17.05.2024", format = "%d.%m.%Y")
format(d, "%Y-%m"); as.numeric(format(d, "%j"))
d + 30
seq(d, by = "month", length.out = 3)
as.numeric(as.Date("2024-08-15") - as.Date("2024-04-20"))
diff(as.Date(c("2024-01-01", "2024-01-15", "2024-02-01")))
```

## Дані та графіка

### Читання та запис CSV
```r static
df <- read.csv("file.csv")                 # на вашому комп'ютері
df <- read.csv2("file.csv")                # ; та десяткова кома
write.csv(df, "out.csv", row.names = FALSE)
```
```r
df <- read.csv(text = "a,b\n1,x\n2,y", na.strings = c("-", ""))
df
```

### Графіки: основні
```r
plot(cars$speed, cars$dist, pch = 19, col = "steelblue", main = "cars", xlab = "швидкість", ylab = "шлях")
abline(lm(dist ~ speed, data = cars), col = "red")
```

### Графіки: розподіли
```r
par(mfrow = c(1, 3))
hist(mtcars$mpg, main = "hist")
boxplot(mpg ~ cyl, data = mtcars, main = "boxplot")
barplot(table(mtcars$gear), main = "barplot")
par(mfrow = c(1, 1))
```

### Графіки: лінії та легенда
```r
x <- 1:10
plot(x, x^2, type = "l", col = "blue")
lines(x, 3 * x, col = "red")
legend("topleft", legend = c("x^2", "3x"), col = c("blue", "red"), lty = 1)
curve(sin, 0, 2 * pi)
```

## Статистика

### Розподіли
```r
pnorm(1.96); qnorm(0.975); dnorm(0)
dbinom(3, 10, 0.5); pbinom(3, 10, 0.5)
ppois(2, 3); pexp(1, 0.5); qt(0.975, 10)
set.seed(1); rnorm(3); runif(3); sample(1:6, 3)
```

### Тести
```r
t.test(extra ~ group, data = sleep)
chisq.test(matrix(c(30, 10, 20, 40), 2))
cor.test(mtcars$mpg, mtcars$wt)
shapiro.test(mtcars$mpg)
prop.test(45, 120, p = 0.5)
summary(aov(weight ~ group, data = PlantGrowth))
wilcox.test(mpg ~ am, data = mtcars, exact = FALSE)
```

### Регресія
```r
fit <- lm(mpg ~ wt + hp, data = mtcars)
summary(fit); coef(fit); confint(fit)
predict(fit, data.frame(wt = 3, hp = 120))
AIC(fit); resid(fit)[1:3]
glm(am ~ wt, data = mtcars, family = binomial)
```

### Часові ряди
```r
y <- ts(c(1, 3, 2, 5, 4, 6, 5, 8), start = c(2023, 1), frequency = 4)
y; window(y, start = c(2023, 3))
decompose(AirPassengers, "multiplicative")$figure[1:3]
diff(log(AirPassengers))[1:3]
```

### Оптимізація та інтеграл
```r
uniroot(function(x) x^2 - 2, c(0, 2))$root
integrate(dnorm, -1.96, 1.96)$value
optimize(function(x) (x - 3)^2, c(0, 10))$minimum
optim(c(0, 0), function(p) sum((p - c(1, 2))^2))$par
```
