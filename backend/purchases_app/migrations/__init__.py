# Generated migration

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Produit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom_produit', models.CharField(max_length=200, unique=True, verbose_name='Nom du produit')),
            ],
            options={
                'verbose_name': 'Produit',
                'verbose_name_plural': 'Produits',
                'ordering': ['nom_produit'],
            },
        ),
        migrations.CreateModel(
            name='Achat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('prix', models.DecimalField(decimal_places=2, max_digits=12, verbose_name='Prix')),
                ('date_achat', models.DateField(verbose_name="Date de l'achat")),
                ('produit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='achats', to='purchases_app.produit', verbose_name='Produit')),
            ],
            options={
                'verbose_name': 'Achat',
                'verbose_name_plural': 'Achats',
                'ordering': ['-date_achat'],
            },
        ),
    ]
