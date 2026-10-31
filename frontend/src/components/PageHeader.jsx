function PageHeader({ eyebrow, title, description, children, as: Heading = "h1" }) {
  return <header className="page-header">
    <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<Heading>{title}</Heading>{description && <p className="text-muted">{description}</p>}</div>
    {children && <div className="page-actions">{children}</div>}
  </header>;
}

export default PageHeader;
