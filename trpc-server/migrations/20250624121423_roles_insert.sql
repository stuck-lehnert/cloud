INSERT INTO roles (name, description)
VALUES  (':admin', 'Administrator'),

        ('view:users', 'Alle Benutzer einsehen'),
        ('create:users', 'Benutzer erstellen'),
        ('modify:users', 'Benutzer bearbeiten'),
        ('delete:users', 'Benutzer löschen'),

        ('view:groups', 'Alle Gruppen einsehen'),
        ('create:groups', 'Gruppen erstellen'),
        ('modify:groups', 'Gruppen bearbeiten'),
        ('delete:groups', 'Gruppen löschen'),
        ('manage:groups', 'Guppen-Mitgliedschaften verwalten'),

        ('manage:roles', 'Rollen verwalten'),

        ('view:projects', 'Alle Projekte einsehen'),
        ('create:projects', 'Projekte erstellen'),
        ('modify:projects', 'Projekte verwalten/bearbeiten'),
        ('delete:projects', 'Projekte löschen'),

        ('view:tools', 'Alle Werkzeuge einsehen'),
        ('create:tools', 'Werkzeuge erstellen'),
        ('modify:tools', 'Werkzeuge bearbeiten'),
        ('delete:tools', 'Werkzeuge löschen'),

        ('track:tools', 'Werkzeuge ein- und ausbuchen'),
        ('view:toolTrackings', 'Alle Werkzeugbuchungen einsehen'),
        ('modify:toolTrackings', 'Werkzeugbuchungen abändern'),
        ('delete:toolTrackings', 'Werkzeugbuchungen löschen'),
        
        ('view:products', 'Alle Produkte einsehen (Kein Effekt)'),
        ('create:products', 'Produkte erstellen'),
        ('modify:products', 'Produkte bearbeiten'),
        ('delete:products', 'Produkte löschen');
