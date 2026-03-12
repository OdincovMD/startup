import React from "react";
import { Link } from "react-router-dom";
import { Card, Badge, Button } from "../ui";

const QUERY_STATUS_LABELS = { active: "Открыт", paused: "На паузе", closed: "Закрыт" };
const DESCRIPTION_MAX = 120;

export default function QueryCard({ query, onOpen, navigate }) {
  const hasLink = !!query.public_id;
  const title = query.title || "Запрос";
  const description = query.task_description || "";
  const truncatedDesc =
    description.length > DESCRIPTION_MAX
      ? `${description.slice(0, DESCRIPTION_MAX)}…`
      : description;

  const metaParts = [];
  if (query.research_direction) metaParts.push(query.research_direction);
  if (query.cooperation_type) metaParts.push(query.cooperation_type);
  if (query.organization?.name) metaParts.push(query.organization.name);
  else if (query.laboratory?.name) metaParts.push(query.laboratory.name);
  const metaText = metaParts.join(" · ");

  return (
    <Card
      variant="solid"
      as="article"
      padding="md"
      className="query-card-modern"
    >
      <div className="query-card-modern__inner">
        <div className="query-card-modern__info">
          <h3 className="query-card-modern__title">
            {hasLink ? (
              <Link
                to={`/queries/${query.public_id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {title}
              </Link>
            ) : (
              <span>{title}</span>
            )}
          </h3>

          {metaText && (
            <div className="query-card-modern__meta">
              {metaText}
            </div>
          )}

          {truncatedDesc && (
            <p className="query-card-modern__desc" title={description}>
              {truncatedDesc}
            </p>
          )}

          {(query.status || query.deadline || query.budget) && (
            <div className="query-card-modern__badges">
              {query.status && (
                <Badge
                  variant={
                    query.status === "active"
                      ? "success"
                      : query.status === "closed"
                        ? "default"
                        : "default"
                  }
                >
                  {QUERY_STATUS_LABELS[query.status] ?? query.status}
                </Badge>
              )}
              {query.deadline && (
                <span className="query-card-modern__meta-inline">
                  Дедлайн: {new Date(query.deadline).toLocaleDateString("ru-RU")}
                </span>
              )}
              {query.budget && (
                <span className="query-card-modern__meta-inline">
                  Бюджет: {query.budget}
                </span>
              )}
            </div>
          )}
        </div>

        {hasLink && (
          <div className="query-card-modern__actions">
            <Button
              variant="ghost"
              size="small"
              to={`/queries/${query.public_id}`}
              className="nowrap-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(query.public_id);
              }}
            >
              Подробнее
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
