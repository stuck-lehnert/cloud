INSERT INTO roles (name, description)
VALUES  (':admin', 'Administrator'),

        ('view:users', 'Alle Benutzer einsehen'),
        ('create:users', 'Benutzer erstellen'),
        ('modify:users', 'Benutzer bearbeiten'),
        ('delete:users', 'Benutzer löschen'),

        ('view:projects', 'Alle Projekte einsehen'),
        ('create:projects', 'Projekte erstellen'),
        ('modify:projects', 'Projekte bearbeiten'),
        ('delete:projects', 'Projekte löschen'),

        ('view:tools', 'Alle Werkzeuge einsehen'),
        ('create:tools', 'Werkzeuge erstellen'),
        ('modify:tools', 'Werkzeuge bearbeiten'),
        ('delete:tools', 'Werkzeuge löschen'),

        ('view:toolTrackings', 'Alle Werkzeugbuchungen einsehen'),
        ('create:toolTrackings', 'Werkzeuge ein- und ausbuchen'),
        ('modify:toolTrackings', 'Werkzeugbuchungen abändern'),
        ('delete:toolTrackings', 'Werkzeugbuchungen löschen');