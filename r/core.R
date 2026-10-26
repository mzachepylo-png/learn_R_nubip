# Ядро навчального середовища: виконання коду користувача та перевірка завдань.
# Цей файл виконується і в браузері (WebR), і в Node (tests/validate.mjs).

options(width = 80, useFancyQuotes = FALSE, warn = 1, scipen = 0, OutDec = ".",
        digits = 7, stringsAsFactors = FALSE)

.nb <- new.env()
.nb$plots <- 0L
.nb$env <- NULL
.nb$out <- character()
.nb$ok <- TRUE
.nb$code <- ""
.nb$sessions <- new.env()

# Лічильник побудованих графіків (plot, hist, barplot, boxplot ... викликають plot.new)
setHook("plot.new", function(...) .nb$plots <- .nb$plots + 1L)

# Середовище-«маска»: вимикаємо команди, що ламають сесію
.nb$mask <- new.env(parent = globalenv())
local({
  off <- function(...) stop("ця команда вимкнена в навчальному середовищі")
  assign("q", off, envir = .nb$mask)
  assign("quit", off, envir = .nb$mask)
  assign("readline", function(prompt = "") { cat(prompt, "\n"); "" }, envir = .nb$mask)
})

.nb_session <- function(name) {
  if (is.null(.nb$sessions[[name]])) {
    .nb$sessions[[name]] <- new.env(parent = .nb$mask)
  }
  .nb$sessions[[name]]
}

.nb_reset_session <- function(name) {
  if (exists(name, envir = .nb$sessions, inherits = FALSE)) rm(list = name, envir = .nb$sessions)
  invisible(TRUE)
}

.nb_show <- function(x) {
  if (isS4(x)) methods::show(x) else base::print(x)
}

# Виконує код: друкує результати видимих виразів, попередження та повідомлення
# виводяться в той самий потік. Повертає c(вивід, "1"/"0", кількість графіків).
.nb_exec <- function(code, setup = "", session = "") {
  env <- if (nzchar(session)) .nb_session(session) else new.env(parent = .nb$mask)
  .nb$plots <- 0L
  ok <- TRUE
  out <- utils::capture.output({
    tryCatch({
      if (nzchar(setup)) {
        for (e in parse(text = setup, keep.source = FALSE)) eval(e, env)
      }
      for (e in parse(text = code, keep.source = FALSE)) {
        r <- withCallingHandlers(
          withVisible(eval(e, env)),
          warning = function(w) {
            base::cat("⚠ Попередження: ", conditionMessage(w), "\n", sep = "")
            invokeRestart("muffleWarning")
          },
          message = function(m) {
            base::cat("ℹ ", sub("\n$", "", conditionMessage(m)), "\n", sep = "")
            invokeRestart("muffleMessage")
          }
        )
        if (r$visible) .nb_show(r$value)
      }
    }, error = function(e) {
      ok <<- FALSE
      cl <- conditionCall(e)
      where <- if (is.null(cl)) "" else paste0(" у ", deparse(cl, width.cutoff = 60L)[1L])
      base::cat("✖ Помилка", where, ": ", conditionMessage(e), "\n", sep = "")
    })
  })
  .nb$env <- env
  .nb$out <- out
  .nb$ok <- ok
  .nb$code <- code
  c(paste(out, collapse = "\n"), if (ok) "1" else "0", as.character(.nb$plots))
}

.nb_norm <- function(x) {
  x <- sub("[[:space:]]+$", "", x)
  x <- x[!grepl("^(⚠|ℹ|✖)", x)]
  x[nzchar(x)]
}

.nb_short <- function(x, n = 6L, width = 200L) {
  s <- utils::capture.output(base::print(x))
  if (length(s) > n) s <- c(s[seq_len(n)], "...")
  s <- substr(s, 1L, width)
  paste(s, collapse = "\n")
}

# Перевірка результату останнього .nb_exec порівняно з еталонним розв'язком.
# spec: list(vars, output, uses, avoid, plot, custom = list(list(test, msg)))
# Повертає c("1"/"0", повідомлення...)
.nb_check <- function(spec, setup = "", solution = "") {
  msgs <- character()
  fail <- function(...) msgs <<- c(msgs, paste0(...))
  bt <- intToUtf8(96L)
  q <- function(x) paste0(bt, x, bt)

  uenv <- .nb$env
  uout <- .nb$out
  ucode <- .nb$code
  uplots <- .nb$plots

  # еталонний розв'язок виконується у власному середовищі, графіки йдуть у «порожній» пристрій
  senv <- new.env(parent = .nb$mask)
  sout <- character()
  solerr <- NULL
  grDevices::pdf(NULL)
  sout <- tryCatch(
    utils::capture.output({
      if (nzchar(setup)) for (e in parse(text = setup, keep.source = FALSE)) eval(e, senv)
      for (e in parse(text = solution, keep.source = FALSE)) {
        r <- withVisible(eval(e, senv))
        if (r$visible) .nb_show(r$value)
      }
    }),
    error = function(e) { solerr <<- conditionMessage(e); character() }
  )
  try(grDevices::dev.off(), silent = TRUE)
  .nb$plots <- uplots
  if (!is.null(solerr)) {
    return(c("0", paste0("Внутрішня помилка еталонного розв'язку: ", solerr)))
  }

  for (v in spec$vars) {
    if (!exists(v, envir = uenv, inherits = FALSE)) {
      fail("Змінну ", q(v), " не знайдено. Створіть її у своєму коді.")
      next
    }
    if (!exists(v, envir = senv, inherits = FALSE)) next
    a <- get(v, envir = uenv, inherits = FALSE)
    b <- get(v, envir = senv, inherits = FALSE)
    r <- all.equal(a, b)
    if (!isTRUE(r)) {
      fail("Значення ", q(v), " не збігається з очікуваним (",
           paste(utils::head(as.character(r), 1L), collapse = ""), "). Зараз ", q(v), " дорівнює:\n", .nb_short(a))
    }
  }

  if (isTRUE(spec$output)) {
    a <- .nb_norm(uout)
    b <- .nb_norm(sout)
    if (!identical(a, b)) {
      fail("Вивід вашого коду не збігається з очікуваним.\nВаш вивід:\n",
           .nb_short(a, 8L), "\nОчікується:\n", .nb_short(b, 8L))
    }
  }

  names_used <- tryCatch(all.names(parse(text = ucode, keep.source = FALSE)), error = function(e) character())
  for (f in spec$uses) {
    if (!(f %in% names_used)) fail("Спробуйте використати ", q(f), " у своєму коді.")
  }
  for (f in spec$avoid) {
    if (f %in% names_used) fail("Це завдання має бути розв’язане без ", q(f), ".")
  }

  if (isTRUE(spec$plot) && uplots < 1L) {
    fail("Потрібно побудувати графік (plot, hist, barplot, boxplot ...).")
  }

  for (ct in spec$custom) {
    cenv <- new.env(parent = uenv)
    assign(".sol", senv, envir = cenv)
    assign(".out", uout, envir = cenv)
    assign(".code", ucode, envir = cenv)
    okc <- tryCatch(isTRUE(eval(parse(text = ct$test, keep.source = FALSE), cenv)),
                    error = function(e) FALSE)
    if (!okc) fail(ct$msg)
  }

  c(if (length(msgs) == 0L) "1" else "0", msgs)
}

# Корисні функції для автоперевірки (доступні в @test)
.nb_has_call <- function(code, fn) fn %in% all.names(parse(text = code, keep.source = FALSE))
