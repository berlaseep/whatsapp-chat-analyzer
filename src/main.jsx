
import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  MessageCircle,
  BarChart3,
  Users,
  Clock3,
  Search,
  Sparkles,
  Upload,
  ArrowLeft,
  Smile,
  CalendarDays,
  Zap,
  AlertTriangle,
} from "lucide-react";

import "./styles.css";

import {
  BANNED_NAMES,
  BANNED_WORDS,
  USER_WORDS,
  SWEARS,
  LOVE,
  THANKS,
  SORRY,
  LAUGH,
  STOPWORDS,
} from "./config.js";


/* =========================================================
   UTILIDADES
========================================================= */

const normalize = (text = "") =>
  String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");


/*
  Escapa caracteres especiales para utilizarlos
  dentro de una expresión regular.
*/
const escapeRegExp = (text = "") =>
  String(text).replace(
    /[-\/\\^$*+?.()|[\]{}]/g,
    "\\$&"
  );


const STOP = new Set(
  (STOPWORDS || []).map((x) => normalize(x))
);

const BANNED_WORD_SET = new Set(
  (BANNED_WORDS || []).map((x) => normalize(x))
);

const USER_WORD_SET = new Set(
  (USER_WORDS || []).map((x) => normalize(x))
);


function words(text = "") {
  const result =
    normalize(text).match(/[a-zñü]+/gi) || [];

  return result.filter((word) => {
    const w = normalize(word);

    if (w.length <= 1) return false;

    if (STOP.has(w)) return false;

    if (BANNED_WORD_SET.has(w)) return false;

    /*
      USER_WORDS permite añadir palabras que
      quieras considerar aunque normalmente
      serían filtradas.
    */
    if (USER_WORD_SET.has(w)) return true;

    return true;
  });
}


function countPhraseMatches(text, list = []) {
  const normalizedText = normalize(text);

  let total = 0;

  for (const item of list) {
    if (!item) continue;

    const value = normalize(item);

    if (!value) continue;

    const regex = new RegExp(
      escapeRegExp(value),
      "gi"
    );

    const matches =
      normalizedText.match(regex);

    if (matches) {
      total += matches.length;
    }
  }

  return total;
}


function countEmojis(text = "") {
  return (
    text.match(
      /[\p{Extended_Pictographic}\uFE0F]/gu
    ) || []
  );
}


function average(values = []) {
  const valid = values.filter(
    (x) =>
      Number.isFinite(x) &&
      x >= 0
  );

  if (!valid.length) return 0;

  return (
    valid.reduce(
      (sum, value) => sum + value,
      0
    ) / valid.length
  );
}


function formatDate(date) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return "Fecha desconocida";
  }

  return date.toLocaleDateString(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}


function formatDateTime(date) {
  if (
    !(date instanceof Date) ||
    Number.isNaN(date.getTime())
  ) {
    return "Fecha desconocida";
  }

  return date.toLocaleString(
    "es-ES",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


function formatDuration(seconds) {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "—";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)} s`;
  }

  const minutes = Math.round(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.round(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} h`;
  }

  return `${Math.round(hours / 24)} días`;
}


/* =========================================================
   PARSER DE WHATSAPP
========================================================= */

function parseWhatsApp(text) {
  const lines = String(text)
    .replace(/\r/g, "")
    .split("\n");

  const messages = [];

  let current = null;

  /*
    Formatos habituales de WhatsApp:

    31/08/2026, 15:30 - Usuario: mensaje
    31/08/26, 15:30 - Usuario: mensaje
    31/08/2026, 15:30 - Usuario: mensaje

    También intenta aceptar variantes con
    diferentes espacios.
  */

  const regex =
    /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})\s*-\s*([^:]+):\s?(.*)$/;

  for (const line of lines) {
    const match = line.match(regex);

    if (match) {
      const [
        ,
        datePart,
        timePart,
        user,
        message,
      ] = match;

      let [
        day,
        month,
        year,
      ] = datePart
        .split("/")
        .map(Number);

      if (year < 100) {
        year += 2000;
      }

      const [
        hour,
        minute,
      ] = timePart
        .split(":")
        .map(Number);

      const date = new Date(
        year,
        month - 1,
        day,
        hour,
        minute
      );

      current = {
        id: messages.length,
        date,
        user: user.trim(),
        text: message || "",
      };

      messages.push(current);
    } else if (
      current &&
      line.trim()
    ) {
      /*
        WhatsApp puede dividir un mensaje
        en varias líneas.
      */

      current.text += `\n${line}`;
    }
  }

  return messages;
}


/* =========================================================
   ESTADÍSTICAS PRINCIPALES
========================================================= */

function calculateStats(messages) {
  const users = [
    ...new Set(
      messages.map(
        (message) => message.user
      )
    ),
  ];

  const stats = {};

  for (const user of users) {
    const userMessages =
      messages.filter(
        (message) =>
          message.user === user
      );

    const allWords =
      userMessages.flatMap(
        (message) =>
          words(message.text)
      );

    const frequency = {};

    for (const word of allWords) {
      frequency[word] =
        (frequency[word] || 0) + 1;
    }

    const top =
      Object.entries(frequency)
        .sort(
          (a, b) => b[1] - a[1]
        )
        .slice(0, 10);


    /* -----------------------------------------
       TIEMPOS DE RESPUESTA
    ----------------------------------------- */

    const responseTimes = [];

    for (
      let i = 1;
      i < messages.length;
      i++
    ) {
      const previous =
        messages[i - 1];

      const current =
        messages[i];

      if (
        current.user === user &&
        previous.user !== user
      ) {
        const seconds =
          (
            current.date.getTime() -
            previous.date.getTime()
          ) / 1000;

        /*
          No consideramos como respuesta
          una conversación retomada al día
          siguiente.
        */
        if (
          seconds >= 0 &&
          seconds <=
            24 * 60 * 60
        ) {
          responseTimes.push(
            seconds
          );
        }
      }
    }


    /* -----------------------------------------
       EMOJIS
    ----------------------------------------- */

    const emojiFrequency = {};

    for (const message of userMessages) {
      const emojis =
        countEmojis(
          message.text
        );

      for (const emoji of emojis) {
        emojiFrequency[emoji] =
          (emojiFrequency[emoji] || 0) +
          1;
      }
    }

    const emojiTop =
      Object.entries(
        emojiFrequency
      )
        .sort(
          (a, b) => b[1] - a[1]
        )
        .slice(0, 10)
        .map(
          ([emoji, count]) => ({
            emoji,
            count,
          })
        );


    /* -----------------------------------------
       MENSAJE MÁS LARGO
    ----------------------------------------- */

    const longestMessage =
      userMessages.length
        ? [...userMessages].sort(
            (a, b) =>
              b.text.length -
              a.text.length
          )[0]
        : null;


    /* -----------------------------------------
       PALABRAS ESPECIALES
    ----------------------------------------- */

    const swearCount =
      userMessages.reduce(
        (total, message) =>
          total +
          countPhraseMatches(
            message.text,
            SWEARS
          ),
        0
      );

    const loveCount =
      userMessages.reduce(
        (total, message) =>
          total +
          countPhraseMatches(
            message.text,
            LOVE
          ),
        0
      );

    const thanksCount =
      userMessages.reduce(
        (total, message) =>
          total +
          countPhraseMatches(
            message.text,
            THANKS
          ),
        0
      );

    const sorryCount =
      userMessages.reduce(
        (total, message) =>
          total +
          countPhraseMatches(
            message.text,
            SORRY
          ),
        0
      );

    const laughCount =
      userMessages.reduce(
        (total, message) =>
          total +
          countPhraseMatches(
            message.text,
            LAUGH
          ),
        0
      );


    stats[user] = {
      messages:
        userMessages.length,

      words:
        allWords.length,

      uniqueWords:
        new Set(allWords).size,

      avgWordsPerMessage:
        userMessages.length
          ? allWords.length /
            userMessages.length
          : 0,

      top,

      emojiTop,

      emojiCount:
        Object.values(
          emojiFrequency
        ).reduce(
          (a, b) => a + b,
          0
        ),

      swearCount,

      loveCount,

      thanksCount,

      sorryCount,

      laughCount,

      responseTimes,

      averageResponse:
        average(responseTimes),

      longestMessage,
    };
  }

  return {
    users,
    stats,
  };
}


/* =========================================================
   SESIONES
========================================================= */

function calculateSessions(messages) {
  if (!messages.length) {
    return [];
  }

  const sessions = [];

  const MAX_GAP =
    60 * 60 * 1000;

  let sessionMessages = [
    messages[0],
  ];

  for (
    let i = 1;
    i < messages.length;
    i++
  ) {
    const previous =
      messages[i - 1];

    const current =
      messages[i];

    const gap =
      current.date.getTime() -
      previous.date.getTime();

    if (gap > MAX_GAP) {
      sessions.push(
        createSession(
          sessionMessages
        )
      );

      sessionMessages = [
        current,
      ];
    } else {
      sessionMessages.push(
        current
      );
    }
  }

  if (sessionMessages.length) {
    sessions.push(
      createSession(
        sessionMessages
      )
    );
  }

  return sessions;
}


function createSession(messages) {
  const first = messages[0];

  const last =
    messages[
      messages.length - 1
    ];

  return {
    start: first.date,
    end: last.date,
    messages,
  };
}


/* =========================================================
   ACTIVIDAD POR DÍA
========================================================= */

function messagesByDay(messages) {
  const result = {};

  for (const message of messages) {
    const date = message.date;

    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    const key =
      `${year}-${month}-${day}`;

    result[key] =
      (result[key] || 0) + 1;
  }

  return Object.entries(result)
    .sort((a, b) =>
      a[0].localeCompare(b[0])
    );
}


/* =========================================================
   ACTIVIDAD POR HORA
========================================================= */

function messagesByHour(messages) {
  const result =
    Array.from(
      { length: 24 },
      (_, hour) => ({
        hour,
        count: 0,
      })
    );

  for (const message of messages) {
    result[
      message.date.getHours()
    ].count++;
  }

  return result;
}


/* =========================================================
   NOMBRES MENCIONADOS
========================================================= */

function calculateNames(
  messages,
  users
) {
  const result = {};

  const userNames =
    new Set(
      users.map((user) =>
        normalize(user)
      )
    );

  for (const message of messages) {
    /*
      Busca palabras que parezcan nombres
      propios.
    */
    const detected =
      message.text.match(
        /\b[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñ]{2,}\b/g
      ) || [];

    for (const name of detected) {
      const normalized =
        normalize(name);

      if (
        (BANNED_NAMES || []).some(
          (banned) =>
            normalize(banned) ===
            normalized
        )
      ) {
        continue;
      }

      if (
        userNames.has(
          normalized
        )
      ) {
        continue;
      }

      result[name] =
        (result[name] || 0) + 1;
    }
  }

  return Object.entries(result)
    .map(
      ([name, count]) => ({
        name,
        count,
      })
    )
    .sort(
      (a, b) =>
        b.count - a.count
    )
    .slice(0, 10);
}


/* =========================================================
   TARJETA DE MÉTRICA
========================================================= */

function MetricCard({
  icon: Icon,
  title,
  value,
  description,
}) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        <Icon size={18} />
      </div>

      <div>
        <span>{title}</span>

        <strong>
          {value}
        </strong>

        {description && (
          <small>
            {description}
          </small>
        )}
      </div>
    </div>
  );
}


/* =========================================================
   TÍTULO DE SECCIÓN
========================================================= */

function SectionTitle({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="section-title">
      <div>
        <Icon size={20} />
      </div>

      <section>
        <h2>{title}</h2>

        {description && (
          <p>
            {description}
          </p>
        )}
      </section>
    </div>
  );
}


/* =========================================================
   BÚSQUEDA DE MENSAJES
========================================================= */

function MessageSearch({
  messages,
  search,
  setSearch,
}) {
  const results =
    useMemo(() => {
      if (!search) return [];

      const term =
        normalize(
          search.term
        );

      if (!term) return [];

      return messages.filter(
        (message) => {
          if (
            search.type ===
            "Emoji"
          ) {
            return message.text.includes(
              search.term
            );
          }

          return normalize(
            message.text
          ).includes(term);
        }
      );
    }, [
      messages,
      search,
    ]);

  if (!search) {
    return null;
  }

  return (
    <main>
      <section className="panel search-panel">
        <div className="search-header">
          <div>
            <button
              className="back-button"
              onClick={() =>
                setSearch(null)
              }
            >
              <ArrowLeft
                size={17}
              />
              Volver
            </button>

            <h3>
              Mensajes con "
              {search.term}"
            </h3>

            <p>
              {results.length} mensaje
              {results.length === 1
                ? ""
                : "s"}{" "}
              encontrado
              {results.length === 1
                ? ""
                : "s"}.
            </p>
          </div>

          <Search size={24} />
        </div>

        <div className="message-results">
          {results.length === 0 && (
            <div className="empty-state">
              No se encontraron
              mensajes.
            </div>
          )}

          {results.map(
            (message) => (
              <article
                className="message-result"
                key={
                  message.id
                }
              >
                <div className="message-meta">
                  <strong>
                    {message.user}
                  </strong>

                  <span>
                    {formatDateTime(
                      message.date
                    )}
                  </span>
                </div>

                <p>
                  {message.text}
                </p>
              </article>
            )
          )}
        </div>
      </section>
    </main>
  );
}


/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  messages,
  users,
  stats,
  setSearch,
  setPage,
}) {
  const sessions =
    useMemo(
      () =>
        calculateSessions(
          messages
        ),
      [messages]
    );

  const dayData =
    useMemo(
      () =>
        messagesByDay(
          messages
        ),
      [messages]
    );

  const hourData =
    useMemo(
      () =>
        messagesByHour(
          messages
        ),
      [messages]
    );

  const nameTop =
    useMemo(
      () =>
        calculateNames(
          messages,
          users
        ),
      [messages, users]
    );


  const totalWords =
    users.reduce(
      (total, user) =>
        total +
        stats[user].words,
      0
    );


  const longestGlobal =
    messages.length
      ? [...messages].sort(
          (a, b) =>
            b.text.length -
            a.text.length
        )[0]
      : null;


  const mostMessages =
    [...users].sort(
      (a, b) =>
        stats[b].messages -
        stats[a].messages
    )[0];


  const vocabularyWinner =
    [...users].sort(
      (a, b) =>
        stats[b].uniqueWords -
        stats[a].uniqueWords
    )[0];


  const fastest =
    [...users]
      .filter(
        (user) =>
          stats[user]
            .responseTimes
            .length > 0
      )
      .sort(
        (a, b) =>
          stats[a]
            .averageResponse -
          stats[b]
            .averageResponse
      )[0];


  const slowest =
    [...users]
      .filter(
        (user) =>
          stats[user]
            .responseTimes
            .length > 0
      )
      .sort(
        (a, b) =>
          stats[b]
            .averageResponse -
          stats[a]
            .averageResponse
      )[0];


  const emojiTop =
    users
      .flatMap((user) =>
        stats[user].emojiTop.map(
          (emoji) => ({
            ...emoji,
            user,
          })
        )
      )
      .sort(
        (a, b) =>
          b.count - a.count
      )
      .slice(0, 10);


  const globalAverageResponse =
    average(
      users.flatMap(
        (user) =>
          stats[user]
            .responseTimes
      )
    );


  return (
    <main>

      {/* HERO */}

      <div className="hero">
        <div>
          <span className="eyebrow">
            WHATSAPP CHAT ANALYZER
          </span>

          <h1>
            Tu conversación,
            <br />
            convertida en datos.
          </h1>

          <p>
            Analiza mensajes,
            tiempos de respuesta,
            vocabulario, emojis y
            patrones de conversación.
          </p>
        </div>

        <button
          className="ai-main-button"
          onClick={() =>
            setPage("ai")
          }
        >
          <Sparkles size={18} />
          Analizar con IA
        </button>
      </div>


      {/* MÉTRICAS */}

      <section className="metric-grid">

        <MetricCard
          icon={MessageCircle}
          title="Mensajes totales"
          value={messages.length.toLocaleString(
            "es-ES"
          )}
          description="Todos los mensajes detectados"
        />

        <MetricCard
          icon={Users}
          title="Participantes"
          value={users.length}
          description="Usuarios detectados"
        />

        <MetricCard
          icon={CalendarDays}
          title="Días analizados"
          value={dayData.length}
          description="Días con actividad"
        />

        <MetricCard
          icon={Clock3}
          title="Sesiones"
          value={sessions.length}
          description="Bloques separados por +1h"
        />

      </section>


      {/* RESUMEN */}

      <SectionTitle
        icon={BarChart3}
        title="Resumen"
        description="Las métricas principales de la conversación."
      />


      <section className="two">

        <section className="panel">
          <h3>
            Quién destaca
          </h3>

          <div className="winner-list">

            <div>
              <span>
                👑 Más mensajes
              </span>

              <strong>
                {mostMessages ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                📚 Mayor vocabulario
              </span>

              <strong>
                {vocabularyWinner ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                ⚡ Responde más rápido
              </span>

              <strong>
                {fastest ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                🐢 Responde más lento
              </span>

              <strong>
                {slowest ||
                  "—"}
              </strong>
            </div>

          </div>
        </section>


        <section className="panel">
          <h3>
            Primer mensaje
          </h3>

          {messages[0] && (
            <article className="featured-message">

              <div>
                <strong>
                  {messages[0].user}
                </strong>

                <span>
                  {formatDateTime(
                    messages[0].date
                  )}
                </span>
              </div>

              <p>
                {messages[0].text}
              </p>

            </article>
          )}
        </section>

      </section>


      {/* MENSAJES POR DÍA */}

      <section className="panel">

        <h3>
          Mensajes por día
        </h3>

        <p className="chart-desc">
          Cada barra representa el número
          total de mensajes enviados durante
          ese día. Eje X = fecha · Eje Y =
          mensajes.
        </p>

        <div className="bar-chart">

          {dayData.map(
            ([day, count]) => {
              const max =
                Math.max(
                  ...dayData.map(
                    (x) => x[1]
                  ),
                  1
                );

              const height =
                Math.max(
                  5,
                  (count / max) *
                    100
                );

              return (
                <div
                  className="bar-item"
                  key={day}
                  title={`${day}: ${count} mensajes`}
                >
                  <span>
                    {count}
                  </span>

                  <div className="bar">
                    <i
                      style={{
                        height: `${height}%`,
                      }}
                    />
                  </div>

                  <small>
                    {day.slice(5)}
                  </small>
                </div>
              );
            }
          )}

        </div>
      </section>


      {/* ACTIVIDAD POR HORA */}

      <section className="panel">

        <h3>
          Actividad por hora
        </h3>

        <p className="chart-desc">
          Número de mensajes enviados durante
          cada hora del día. 00 = medianoche.
        </p>

        <div className="hour-chart">

          {hourData.map(
            (item) => {
              const max =
                Math.max(
                  ...hourData.map(
                    (x) =>
                      x.count
                  ),
                  1
                );

              return (
                <div
                  className="hour-item"
                  key={item.hour}
                  title={`${String(
                    item.hour
                  ).padStart(
                    2,
                    "0"
                  )}:00 — ${
                    item.count
                  } mensajes`}
                >
                  <div
                    className="hour-bar"
                    style={{
                      height: `${Math.max(
                        4,
                        (item.count /
                          max) *
                          100
                      )}%`,
                    }}
                  />

                  <small>
                    {String(
                      item.hour
                    ).padStart(
                      2,
                      "0"
                    )}
                  </small>
                </div>
              );
            }
          )}

        </div>
      </section>


      {/* USUARIOS */}

      <SectionTitle
        icon={Users}
        title="Usuarios"
        description="Comparación individual entre participantes."
      />


      <section className="user-grid">

        {users.map(
          (user) => {
            const s =
              stats[user];

            return (
              <section
                className="panel user-card"
                key={user}
              >

                <div className="user-heading">

                  <div className="avatar">
                    {user
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3>
                      {user}
                    </h3>

                    <span>
                      {s.messages.toLocaleString(
                        "es-ES"
                      )}{" "}
                      mensajes
                    </span>
                  </div>

                </div>


                <div className="mini-stats">

                  <div>
                    <b>
                      {s.words}
                    </b>
                    <span>
                      palabras
                    </span>
                  </div>

                  <div>
                    <b>
                      {s.uniqueWords}
                    </b>
                    <span>
                      distintas
                    </span>
                  </div>

                  <div>
                    <b>
                      {Math.round(
                        s.avgWordsPerMessage
                      )}
                    </b>
                    <span>
                      por mensaje
                    </span>
                  </div>

                  <div>
                    <b>
                      {formatDuration(
                        s.averageResponse
                      )}
                    </b>
                    <span>
                      respuesta media
                    </span>
                  </div>

                </div>

              </section>
            );
          }
        )}

      </section>


      {/* PALABRAS */}

      <section className="two">

        <section className="panel">

          <h3>
            Top palabras
          </h3>

          <p className="chart-desc">
            Pulsa una palabra para ver todos
            los mensajes donde aparece.
          </p>

          {users.map(
            (user) => (
              <div
                className="userblock"
                key={user}
              >

                <b>
                  {user}
                </b>

                {stats[user].top.map(
                  ([word, count]) => {

                    const max =
                      stats[user]
                        .top[0]?.[1] ||
                      1;

                    return (
                      <button
                        className="click-row"
                        onClick={() =>
                          setSearch({
                            type: "Palabra",
                            term: word,
                          })
                        }
                        key={word}
                      >

                        <span>
                          {word}
                        </span>

                        <i
                          style={{
                            width: `${Math.min(
                              100,
                              (count /
                                max) *
                                100
                            )}%`,
                          }}
                        />

                        <b>
                          {count}
                        </b>

                      </button>
                    );
                  }
                )}

              </div>
            )
          )}

        </section>


        {/* NOMBRES */}

        <section className="panel">

          <h3>
            Top 10 nombres mencionados
          </h3>

          <p className="chart-desc">
            Pulsa un nombre para ver todos
            los mensajes donde aparece.
          </p>

          <div className="rank">

            {nameTop.map(
              (item, index) => (
                <button
                  className="rank-button"
                  onClick={() =>
                    setSearch({
                      type: "Nombre",
                      term: item.name,
                    })
                  }
                  key={item.name}
                >

                  <b>
                    #{index + 1}
                  </b>

                  <span>
                    {item.name}
                  </span>

                  <strong>
                    {item.count}
                  </strong>

                </button>
              )
            )}

            {!nameTop.length && (
              <div className="empty-state">
                No se detectaron
                nombres.
              </div>
            )}

          </div>
        </section>

      </section>


      {/* EMOJIS */}

      <section className="panel">

        <h3>
          Top emojis
        </h3>

        <p className="chart-desc">
          Emojis más utilizados. Pulsa uno para
          ver todos los mensajes donde aparece.
        </p>

        <div className="emoji-grid">

          {emojiTop.map(
            (item) => (
              <button
                className="emoji-button"
                onClick={() =>
                  setSearch({
                    type: "Emoji",
                    term: item.emoji,
                  })
                }
                key={`${item.emoji}-${item.user}`}
              >

                <span>
                  {item.emoji}
                </span>

                <small>
                  {item.count}
                </small>

              </button>
            )
          )}

        </div>
      </section>


      {/* MENSAJES MÁS LARGOS */}

      <SectionTitle
        icon={MessageCircle}
        title="Mensajes más largos"
        description="El mensaje con mayor número de caracteres de cada participante."
      />


      <section className="user-grid">

        {users.map(
          (user) => {
            const message =
              stats[user]
                .longestMessage;

            return (
              <section
                className="panel longest-card"
                key={user}
              >

                <div className="user-heading">

                  <div className="avatar">
                    {user
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <h3>
                      {user}
                    </h3>

                    <span>
                      {message
                        ? `${message.text.length} caracteres`
                        : "Sin mensajes"}
                    </span>
                  </div>

                </div>

                {message && (
                  <>
                    <blockquote>
                      {message.text}
                    </blockquote>

                    <small>
                      {formatDateTime(
                        message.date
                      )}
                    </small>
                  </>
                )}

              </section>
            );
          }
        )}

      </section>


      {/* SESIONES */}

      <SectionTitle
        icon={Clock3}
        title="Sesiones"
        description="Bloques de conversación separados por más de una hora de silencio."
      />


      <section className="panel">

        <div className="session-list">

          {sessions
            .slice(-30)
            .reverse()
            .map(
              (
                session,
                index
              ) => {

                const first =
                  session
                    .messages[0];

                const last =
                  session
                    .messages[
                      session
                        .messages
                        .length -
                        1
                    ];

                return (
                  <article
                    className="session"
                    key={`${session.start.getTime()}-${index}`}
                  >

                    <div className="session-time">

                      <strong>
                        {formatDateTime(
                          session.start
                        )}
                      </strong>

                      <span>
                        hasta{" "}
                        {formatDateTime(
                          session.end
                        )}
                      </span>

                    </div>


                    <div className="session-info">

                      <b>
                        {
                          session
                            .messages
                            .length
                        }{" "}
                        mensajes
                      </b>

                      <span>
                        {first?.user ||
                          "—"}{" "}
                        →{" "}
                        {last?.user ||
                          "—"}
                      </span>

                    </div>

                  </article>
                );
              }
            )}

        </div>

      </section>


      {/* OTROS DATOS */}

      <SectionTitle
        icon={Zap}
        title="Otros datos"
        description="Indicadores adicionales de la conversación."
      />


      <section className="metric-grid">

        <MetricCard
          icon={MessageCircle}
          title="Palabras totales"
          value={totalWords.toLocaleString(
            "es-ES"
          )}
          description="Después de aplicar filtros"
        />

        <MetricCard
          icon={MessageCircle}
          title="Mensaje más largo"
          value={
            longestGlobal
              ? `${longestGlobal.text.length} caracteres`
              : "—"
          }
          description={
            longestGlobal
              ? longestGlobal.user
              : ""
          }
        />

        <MetricCard
          icon={Clock3}
          title="Respuesta media"
          value={formatDuration(
            globalAverageResponse
          )}
          description="Entre mensajes de distintos usuarios"
        />

        <MetricCard
          icon={Smile}
          title="Emojis"
          value={users
            .reduce(
              (total, user) =>
                total +
                stats[user]
                  .emojiCount,
              0
            )
            .toLocaleString(
              "es-ES"
            )}
          description="Emojis detectados"
        />

      </section>

    </main>
  );
}


/* =========================================================
   DATOS PARA LA IA
========================================================= */

function buildAIPayload(
  messages,
  users,
  stats
) {
  const sessions =
    calculateSessions(
      messages
    );

  const dayData =
    messagesByDay(
      messages
    );

  const hourData =
    messagesByHour(
      messages
    );


  return {
    conversation: {
      participants:
        users,

      totalMessages:
        messages.length,

      totalWords:
        users.reduce(
          (total, user) =>
            total +
            stats[user].words,
          0
        ),

      analysedDays:
        dayData.length,

      sessions:
        sessions.length,

      firstMessage:
        messages[0]
          ? {
              user:
                messages[0]
                  .user,

              date:
                messages[0]
                  .date
                  .toISOString(),

              text:
                messages[0]
                  .text,
            }
          : null,

      lastMessage:
        messages.length
          ? {
              user:
                messages[
                  messages.length -
                    1
                ].user,

              date:
                messages[
                  messages.length -
                    1
                ].date
                  .toISOString(),

              text:
                messages[
                  messages.length -
                    1
                ].text,
            }
          : null,
    },


    users:
      users.map(
        (user) => ({
          name: user,

          messages:
            stats[user]
              .messages,

          words:
            stats[user]
              .words,

          uniqueWords:
            stats[user]
              .uniqueWords,

          averageWordsPerMessage:
            Number(
              stats[user]
                .avgWordsPerMessage
                .toFixed(2)
            ),

          averageResponseSeconds:
            Math.round(
              stats[user]
                .averageResponse
            ),

          loveExpressions:
            stats[user]
              .loveCount,

          thanks:
            stats[user]
              .thanksCount,

          apologies:
            stats[user]
              .sorryCount,

          laughs:
            stats[user]
              .laughCount,

          swearWords:
            stats[user]
              .swearCount,

          emojis:
            stats[user]
              .emojiCount,

          topWords:
            stats[user]
              .top
              .slice(0, 10),

          topEmojis:
            stats[user]
              .emojiTop,

          longestMessage:
            stats[user]
              .longestMessage
              ? {
                  length:
                    stats[user]
                      .longestMessage
                      .text
                      .length,

                  date:
                    stats[user]
                      .longestMessage
                      .date
                      .toISOString(),

                  text:
                    stats[user]
                      .longestMessage
                      .text,
                }
              : null,
        })
      ),


    activity: {
      byHour:
        hourData,

      messagesPerDay:
        dayData.slice(-90),
    },


    methodology: {
      note:
        "Las estadísticas se calculan localmente. Las interpretaciones de IA no constituyen diagnósticos psicológicos.",
    },
  };
}


/* =========================================================
   PÁGINA DE IA
========================================================= */

function AIPage({
  messages,
  users,
  stats,
  rawChat,
}) {
  const [loading, setLoading] =
    useState(false);

  const [result, setResult] =
    useState("");

  const [error, setError] =
    useState("");


  const analyze = async () => {
    setLoading(true);
    setResult("");
    setError("");


    try {
      const statistics =
        buildAIPayload(
          messages,
          users,
          stats
        );


      const userList =
        users.length
          ? users.join(
              " y "
            )
          : "los participantes";


      const prompt = `
Analiza la siguiente conversación de WhatsApp.

Participantes: ${userList}

Quiero un análisis serio, directo y basado en los datos.

Organiza la respuesta utilizando estas secciones:

1. RESUMEN GENERAL
2. ANÁLISIS DE CADA PARTICIPANTE
3. DINÁMICA ENTRE AMBOS
4. NIVEL DE INTERÉS
5. COMUNICACIÓN
6. RED FLAGS
7. GREEN FLAGS
8. POSIBLES PATRONES DE APEGO
9. CONCLUSIÓN

Para cada interpretación importante explica qué datos la apoyan.

REGLAS IMPORTANTES:

- No diagnostiques trastornos psicológicos.
- No afirmes un estilo de apego como un hecho.
- Utiliza expresiones como "podría indicar" o "es compatible con".
- Diferencia claramente entre datos objetivos e interpretación.
- No inventes información.
- No confundas cantidad de mensajes con interés romántico automáticamente.
- No confundas rapidez de respuesta con interés automáticamente.
- No confundas lenguaje afectivo con amor.
- Si no existen suficientes datos para una conclusión, dilo.
- No juzgues moralmente a los participantes.
- Sé honesto incluso cuando la conclusión sea negativa.

ESTADÍSTICAS CALCULADAS LOCALMENTE:

${JSON.stringify(
  statistics,
  null,
  2
)}

============================================================
TRANSCRIPCIÓN COMPLETA DEL ARCHIVO TXT ORIGINAL
============================================================

Analiza también el contenido íntegro de esta transcripción. No te limites a las estadísticas: revisa mensajes individuales, contexto, secuencia temporal, cambios de tono, conversaciones largas y cortas, reciprocidad, temas, conflictos, reconciliaciones, muestras de afecto, silencios y cualquier patrón que pueda observarse.

IMPORTANTE: esta es la transcripción completa disponible para este análisis. No inventes mensajes que no aparezcan aquí. Si el archivo resulta demasiado grande para procesarlo íntegramente, indícalo explícitamente y trabaja con la mayor cantidad de contenido posible sin afirmar que has analizado el 100%.

--- INICIO DEL TXT ---
${rawChat}
--- FIN DEL TXT ---
`;


      const response =
        await fetch(
          "/api/ai",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              prompt,
            }),
          }
        );


      const raw =
        await response.text();


      let data;

      try {
        data =
          JSON.parse(raw);
      } catch {
        throw new Error(
          `El servidor devolvió una respuesta no válida (HTTP ${response.status}).`
        );
      }


      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            "Error desconocido del servidor de IA."
        );
      }


      setResult(
        data.text ||
          "La IA no devolvió ningún texto."
      );

    } catch (err) {

      setError(
        err?.message ||
          "No se pudo realizar el análisis."
      );

    } finally {

      setLoading(false);

    }
  };


  return (
    <main>

      <div className="hero ai-hero">

        <div>

          <span className="eyebrow">
            INTELIGENCIA ARTIFICIAL
          </span>

          <h1>
            Ahora vamos
            <br />
            más allá de los números.
          </h1>

          <p>
            Gemini analiza los patrones obtenidos
            de la conversación y los convierte en
            una interpretación estructurada.
          </p>

        </div>


        <div className="ai-status">

          <Sparkles size={18} />

          <span>
            Gemini · servidor seguro
          </span>

        </div>

      </div>


      <section className="panel ai-panel">

        <div className="ai-panel-heading">

          <div className="ai-icon">
            <Sparkles size={24} />
          </div>

          <div>

            <h3>
              Análisis inteligente
            </h3>

            <p>
              La API key permanece en el
              servidor y no se expone al
              navegador.
            </p>

          </div>

        </div>


        <div className="ai-grid">

          <div>
            <b>
              🧠 Comunicación
            </b>

            <span>
              Cómo se expresa cada
              participante.
            </span>
          </div>

          <div>
            <b>
              ❤️ Interés
            </b>

            <span>
              Patrones de implicación
              conversacional.
            </span>
          </div>

          <div>
            <b>
              🚩 Red flags
            </b>

            <span>
              Señales observables,
              no diagnósticos.
            </span>
          </div>

          <div>
            <b>
              🔗 Apego
            </b>

            <span>
              Patrones compatibles,
              no diagnósticos.
            </span>
          </div>

        </div>


        <button
          className="ai-button"
          onClick={analyze}
          disabled={
            loading ||
            !messages.length
          }
        >

          {loading ? (
            <>
              <Sparkles size={17} />
              Analizando conversación...
            </>
          ) : (
            <>
              <Sparkles size={17} />
              Analizar conversación
            </>
          )}

        </button>


        {error && (
          <div className="warning">

            <AlertTriangle
              size={18}
            />

            <div>

              <strong>
                No se pudo realizar
                el análisis
              </strong>

              <p>
                {error}
              </p>

              <small>
                Comprueba que el servidor
                esté ejecutándose y que la
                API esté configurada
                correctamente.
              </small>

            </div>

          </div>
        )}


        {result && (
          <article className="ai-result">

            <div className="ai-result-header">

              <Sparkles size={20} />

              <div>

                <strong>
                  Análisis completado
                </strong>

                <span>
                  Generado mediante Gemini
                </span>

              </div>

            </div>


            <div className="ai-result-text">
              {result}
            </div>

          </article>
        )}

      </section>


      <section className="panel">

        <h3>
          ¿Qué información recibe la IA?
        </h3>

        <p className="chart-desc">
          La aplicación calcula primero las
          estadísticas localmente. Después envía
          a la IA un perfil estructurado con
          métricas de los participantes,
          actividad, vocabulario y otros
          indicadores.
        </p>


        <div className="privacy-grid">

          <div>
            <b>
              📊 Estadísticas
            </b>

            <span>
              Mensajes, palabras, emojis,
              respuestas y actividad.
            </span>
          </div>

          <div>
            <b>
              👥 Comparación
            </b>

            <span>
              Diferencias entre los
              participantes.
            </span>
          </div>

          <div>
            <b>
              🔒 API protegida
            </b>

            <span>
              La clave permanece en el
              servidor.
            </span>
          </div>

        </div>

      </section>

    </main>
  );
}


/* =========================================================
   APP
========================================================= */

function App() {

  const [messages, setMessages] =
    useState([]);

  // Conservamos el TXT original completo para el análisis profundo de IA.
  const [rawChat, setRawChat] = useState("");

  const [fileName, setFileName] =
    useState("");

  const [page, setPage] =
    useState("dashboard");

  const [search, setSearch] =
    useState(null);


  const analysis =
    useMemo(() => {

      if (!messages.length) {
        return {
          users: [],
          stats: {},
        };
      }

      return calculateStats(
        messages
      );

    }, [messages]);


  const handleFile = async (
    event
  ) => {

    const file =
      event.target.files?.[0];

    if (!file) return;


    try {

      const text =
        await file.text();

      const parsed =
        parseWhatsApp(
          text
        );


      if (!parsed.length) {

        alert(
          "No se han podido detectar mensajes de WhatsApp en este archivo."
        );

        return;
      }


      setMessages(parsed);
      setRawChat(text);

      setFileName(
        file.name
      );

      setPage(
        "dashboard"
      );

      setSearch(null);

    } catch (error) {

      console.error(
        error
      );

      alert(
        "No se pudo leer el archivo."
      );
    }
  };


  const reset = () => {

    setMessages([]);
    setRawChat("");

    setFileName("");

    setSearch(null);

    setPage(
      "dashboard"
    );
  };


  /* -----------------------------------------
     PANTALLA DE SUBIDA
  ----------------------------------------- */

  if (!messages.length) {

    return (
      <div className="app">

        <header className="topbar">

          <div className="brand">

            <MessageCircle
              size={22}
            />

            <span>
              WhatsApp Analyzer
            </span>

          </div>

        </header>


        <main>

          <div className="upload-page">

            <div className="upload-icon">
              <Upload size={34} />
            </div>

            <span className="eyebrow">
              WHATSAPP CHAT ANALYZER
            </span>

            <h1>
              Descubre lo que
              <br />
              hay detrás del chat.
            </h1>

            <p>
              Sube el archivo TXT exportado
              desde WhatsApp y analiza la
              conversación directamente en
              tu navegador.
            </p>


            <label className="upload-button">

              <Upload size={18} />

              Seleccionar chat TXT

              <input
                type="file"
                accept=".txt,text/plain"
                onChange={
                  handleFile
                }
                hidden
              />

            </label>


            <small>
              El análisis estadístico se
              realiza localmente en tu
              dispositivo.
            </small>

          </div>

        </main>

      </div>
    );
  }


  /* -----------------------------------------
     APLICACIÓN
  ----------------------------------------- */

  return (
    <div className="app">

      <header className="topbar">

        <div className="brand">

          <MessageCircle
            size={22}
          />

          <span>
            WhatsApp Analyzer
          </span>

        </div>


        <div className="top-actions">

          <span className="file-name">
            {fileName}
          </span>


          <button
            onClick={() =>
              setPage(
                "dashboard"
              )
            }
            className={
              page ===
              "dashboard"
                ? "nav-active"
                : ""
            }
          >
            <BarChart3
              size={16}
            />

            Análisis
          </button>


          <button
            onClick={() =>
              setPage("ai")
            }
            className={
              page === "ai"
                ? "nav-active"
                : ""
            }
          >

            <Sparkles
              size={16}
            />

            IA

          </button>


          <button
            onClick={reset}
            className="reset-button"
          >
            Otro chat
          </button>

        </div>

      </header>


      {search && (
        <MessageSearch
          messages={messages}
          search={search}
          setSearch={
            setSearch
          }
        />
      )}


      {!search &&
        page ===
          "dashboard" && (
          <Dashboard
            messages={
              messages
            }
            users={
              analysis.users
            }
            stats={
              analysis.stats
            }
            setSearch={
              setSearch
            }
            setPage={
              setPage
            }
          />
        )}


      {!search &&
        page === "ai" && (
          <AIPage
            messages={
              messages
            }
            rawChat={
              rawChat
            }
            users={
              analysis.users
            }
            stats={
              analysis.stats
            }
          />
        )}

    </div>
  );
}


/* =========================================================
   ARRANQUE
========================================================= */

createRoot(
  document.getElementById(
    "root"
  )
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
