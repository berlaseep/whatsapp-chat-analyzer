
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

function AIReport({ report, onSave, onClear }) {
  if (!report) return null;

  const Section = ({ icon, title, children, tone = "" }) => (
    <section className={`ai-report-section ${tone}`}>
      <div className="ai-section-title">
        <span className="ai-section-icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className="ai-section-body">{children}</div>
    </section>
  );

  const List = ({ items = [], className = "" }) => (
    <ul className={`ai-list ${className}`}>
      {items.filter(Boolean).map((item, index) => (
        <li key={`${index}-${String(item).slice(0, 20)}`}>{item}</li>
      ))}
    </ul>
  );

  const people = Array.isArray(report.participants) ? report.participants : [];

  return (
    <article className="ai-report">
      <div className="ai-report-top">
        <div>
          <span className="ai-report-kicker">AI RELATIONSHIP REPORT</span>
          <h2>Lectura de la conversación</h2>
          <p>
            Interpretación de Gemini basada en las estadísticas locales y en el
            contenido disponible del chat.
          </p>
        </div>
        <div className="ai-report-actions">
          <button className="ai-save-button" onClick={onSave}>
            💾 Guardar análisis
          </button>
          <button className="ai-clear-button" onClick={onClear}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="ai-score-grid">
        <div className="ai-score-card featured">
          <span>Interés / implicación</span>
          <strong>{Number.isFinite(Number(report.interest_score)) ? `${report.interest_score}/100` : "—"}</strong>
          <div className="score-track">
            <i style={{ width: `${Math.max(0, Math.min(100, Number(report.interest_score) || 0))}%` }} />
          </div>
          <small>{report.interest_label || "Sin valoración suficiente"}</small>
        </div>
        <div className="ai-score-card">
          <span>Reciprocidad</span>
          <strong>{Number.isFinite(Number(report.reciprocity_score)) ? `${report.reciprocity_score}/100` : "—"}</strong>
          <small>{report.reciprocity_label || "Datos insuficientes"}</small>
        </div>
        <div className="ai-score-card">
          <span>Comunicación</span>
          <strong>{Number.isFinite(Number(report.communication_score)) ? `${report.communication_score}/100` : "—"}</strong>
          <small>{report.communication_label || "Datos insuficientes"}</small>
        </div>
      </div>

      <Section icon="🧠" title="Resumen general">
        <p className="ai-lead">{report.summary || "La IA no proporcionó un resumen."}</p>
        {report.key_observations?.length ? (
          <List items={report.key_observations} className="check-list" />
        ) : null}
      </Section>

      <div className="ai-two-column">
        {people.map((person, index) => (
          <Section key={index} icon="👤" title={person.name || `Participante ${index + 1}`}>
            <p>{person.summary || "Sin resumen disponible."}</p>
            {person.strengths?.length ? (
              <>
                <h4>Lo que destaca</h4>
                <List items={person.strengths} className="check-list" />
              </>
            ) : null}
            {person.behaviors?.length ? (
              <>
                <h4>Patrones observables</h4>
                <List items={person.behaviors} />
              </>
            ) : null}
          </Section>
        ))}
      </div>

      <Section icon="💬" title="Dinámica entre ambos">
        <p>{report.dynamic || "No hay datos suficientes para describir la dinámica."}</p>
        {report.communication?.length ? <List items={report.communication} /> : null}
      </Section>

      <div className="ai-two-column">
        <Section icon="🚩" title="Red flags" tone="danger">
          {report.red_flags?.length ? (
            <div className="ai-alert-list">
              {report.red_flags.map((item, index) => (
                <div className="ai-alert-card" key={index}>
                  <span>!</span><p>{item}</p>
                </div>
              ))}
            </div>
          ) : <p className="ai-positive">No se han detectado señales claras con los datos disponibles.</p>}
        </Section>

        <Section icon="💚" title="Green flags" tone="positive">
          {report.green_flags?.length ? (
            <List items={report.green_flags} className="check-list" />
          ) : <p>No se han encontrado señales claras suficientes.</p>}
        </Section>
      </div>

      <Section icon="🔗" title="Posibles patrones de apego">
        <p>{report.attachment || "No hay suficiente información para formular una hipótesis responsable."}</p>
        <small className="ai-disclaimer">
          Esto no es un diagnóstico psicológico. Son patrones conversacionales que podrían ser compatibles con determinadas formas de relacionarse.
        </small>
      </Section>

      <Section icon="🎯" title="Conclusión">
        <p className="ai-conclusion">{report.conclusion || "No se pudo generar una conclusión."}</p>
      </Section>

      {report.evidence?.length ? (
        <Section icon="🔎" title="Qué datos apoyan la interpretación">
          <List items={report.evidence} />
        </Section>
      ) : null}
    </article>
  );
}


function parseAIResponse(text) {
  const raw = String(text || "").trim();

  // Gemini puede envolver JSON en ```json ... ```
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}

  // Compatibilidad con respuestas antiguas de texto.
  return {
    summary: raw,
    key_observations: [],
    participants: [],
    dynamic: "",
    interest_score: null,
    interest_label: "",
    reciprocity_score: null,
    reciprocity_label: "",
    communication_score: null,
    communication_label: "",
    communication: [],
    red_flags: [],
    green_flags: [],
    attachment: "",
    conclusion: raw,
    evidence: [],
    legacy_text: true,
  };
}



function simpleHash(text = "") {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function AIPage({ messages, users, stats, rawChat }) {
  const [loading, setLoading] = useState(false);
  const storageKey = `wtsanalyzer_ai_report_${simpleHash(rawChat)}`;
  const [report, setReport] = useState(() => {
    try {
      const saved = localStorage.getItem(`wtsanalyzer_ai_report_${simpleHash(rawChat)}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true);
    setReport(null);
    setError("");

    try {
      const statistics = buildAIPayload(messages, users, stats);
      const userList = users.length ? users.join(" y ") : "los participantes";

      const prompt = `
Analiza esta conversación de WhatsApp de forma seria, directa y responsable.

Participantes: ${userList}

DEVUELVE ÚNICAMENTE JSON VÁLIDO. No uses Markdown, no uses bloques de código y no escribas texto fuera del JSON.

Usa exactamente esta estructura:
{
  "summary": "resumen general breve",
  "key_observations": ["observación 1", "observación 2"],
  "participants": [
    {
      "name": "nombre exacto",
      "summary": "resumen de su forma de comunicarse",
      "strengths": ["fortaleza observable"],
      "behaviors": ["patrón observable"]
    }
  ],
  "dynamic": "análisis de la dinámica entre ambos",
  "interest_score": 0,
  "interest_label": "bajo / medio / alto / insuficiente",
  "reciprocity_score": 0,
  "reciprocity_label": "baja / media / alta / insuficiente",
  "communication_score": 0,
  "communication_label": "difícil / irregular / buena / muy buena / insuficiente",
  "communication": ["patrón de comunicación 1"],
  "red_flags": ["señal observable o explicación prudente"],
  "green_flags": ["señal positiva observable"],
  "attachment": "hipótesis muy prudente sobre patrones de apego, o insuficiente",
  "conclusion": "conclusión clara y equilibrada",
  "evidence": ["dato o patrón concreto que apoya una interpretación"]
}

Los scores de 0 a 100 son estimaciones interpretativas, NO estadísticas. Si no hay datos suficientes usa null y "insuficiente". No conviertas cantidad de mensajes, rapidez de respuesta o lenguaje cariñoso en una prueba automática de interés o amor.

REGLAS:
- No diagnostiques trastornos psicológicos.
- No afirmes estilos de apego como hechos.
- Distingue datos objetivos de interpretación.
- No inventes mensajes, hechos ni contexto.
- Sé honesto si la evidencia es insuficiente.
- Las red flags deben describir conductas observables, no etiquetar personas.
- Las green flags también deben estar respaldadas por el chat.
- No juzgues moralmente a los participantes.
- Analiza el contenido completo disponible; si no cabe íntegramente, dilo en summary y no afirmes haber analizado el 100%.

ESTADÍSTICAS CALCULADAS LOCALMENTE:
${JSON.stringify(statistics, null, 2)}

TRANSCRIPCIÓN COMPLETA:
--- INICIO ---
${rawChat}
--- FIN ---
`;

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`El servidor devolvió una respuesta no válida (HTTP ${response.status}).`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Error desconocido del servidor de IA.");
      }

      const parsed = parseAIResponse(data.text);
      setReport(parsed);
      localStorage.setItem(storageKey, JSON.stringify(parsed));
    } catch (err) {
      setError(err?.message || "No se pudo realizar el análisis.");
    } finally {
      setLoading(false);
    }
  };

  const saveReport = () => {
    if (!report) return;
    const text = [
      "WHATSAPP ANALYZER — INFORME IA",
      "",
      report.summary || "",
      "",
      ...(report.participants || []).flatMap((p) => [
        `PARTICIPANTE: ${p.name || ""}`,
        p.summary || "",
        ...(p.strengths || []).map((x) => `• ${x}`),
        ...(p.behaviors || []).map((x) => `• ${x}`),
        "",
      ]),
      `INTERÉS: ${report.interest_score ?? "—"}/100 — ${report.interest_label || ""}`,
      `RECIPROCIDAD: ${report.reciprocity_score ?? "—"}/100 — ${report.reciprocity_label || ""}`,
      `COMUNICACIÓN: ${report.communication_score ?? "—"}/100 — ${report.communication_label || ""}`,
      "",
      `DINÁMICA: ${report.dynamic || ""}`,
      "",
      "RED FLAGS",
      ...(report.red_flags || []).map((x) => `• ${x}`),
      "",
      "GREEN FLAGS",
      ...(report.green_flags || []).map((x) => `• ${x}`),
      "",
      "POSIBLES PATRONES DE APEGO",
      report.attachment || "",
      "",
      "CONCLUSIÓN",
      report.conclusion || "",
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-analyzer-informe-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearReport = () => {
    setReport(null);
    localStorage.removeItem(storageKey);
  };

  return (
    <main className="ai-page">
      <div className="ai-hero">
        <div>
          <span className="eyebrow">INTELIGENCIA ARTIFICIAL</span>
          <h1>Ahora vamos<br />más allá de los números.</h1>
          <p>
            Gemini transforma los patrones de tu conversación en un informe visual,
            manteniendo separadas las estadísticas de las interpretaciones.
          </p>
        </div>
        <div className="ai-status"><Sparkles size={18} /><span>Gemini · servidor seguro</span></div>
      </div>

      {!report && (
        <section className="panel ai-panel ai-start-panel">
          <div className="ai-panel-heading">
            <div className="ai-icon"><Sparkles size={24} /></div>
            <div>
              <h3>Análisis inteligente</h3>
              <p>La API key permanece en el servidor y no se expone al navegador.</p>
            </div>
          </div>

          <div className="ai-grid">
            <div><b>🧠 Comunicación</b><span>Cómo se expresa cada participante.</span></div>
            <div><b>❤️ Interés</b><span>Patrones de implicación conversacional.</span></div>
            <div><b>🚩 Red flags</b><span>Señales observables, no diagnósticos.</span></div>
            <div><b>🔗 Apego</b><span>Hipótesis prudentes, no diagnósticos.</span></div>
          </div>

          <button className="ai-main-button" onClick={analyze} disabled={loading || !messages.length}>
            <Sparkles size={17} />
            {loading ? "Analizando conversación..." : "Analizar conversación"}
          </button>
        </section>
      )}

      {loading && (
        <section className="panel ai-loading-card">
          <div className="ai-loader"><Sparkles size={24} /></div>
          <div>
            <strong>Analizando tu conversación…</strong>
            <p>Estamos leyendo patrones, contexto y estadísticas. Esto puede tardar unos segundos.</p>
          </div>
        </section>
      )}

      {error && (
        <div className="warning">
          <AlertTriangle size={18} />
          <div>
            <strong>No se pudo realizar el análisis</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {report && !loading && (
        <AIReport report={report} onSave={saveReport} onClear={clearReport} />
      )}

      <section className="panel privacy-panel">
        <h3>Privacidad del análisis</h3>
        <p className="chart-desc">
          Las estadísticas se calculan localmente. Para el modo IA, el TXT y las métricas
          se envían al servidor para generar la interpretación. La clave de Gemini nunca
          se envía al navegador.
        </p>
        <div className="privacy-grid">
          <div><b>📊 Estadísticas locales</b><span>El análisis básico ocurre en tu dispositivo.</span></div>
          <div><b>🤖 IA</b><span>El contenido necesario se envía a Gemini mediante el Worker.</span></div>
          <div><b>💾 Guardado</b><span>El informe se guarda en este dispositivo y también puede descargarse como TXT.</span></div>
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
