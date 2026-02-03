"""
purchases_app.models

Modélisation selon le MCD MERISE :
  PRODUIT (idProduit, nomProduit)
  ACHAT   (idAchat, dateAchat, prix)  →  ForeignKey vers PRODUIT (1,1 / 0,n)
"""

from django.db import models


class Produit(models.Model):
    """Représente un produit dans le système."""

    nom_produit = models.CharField(
        max_length=200,
        unique=True,
        verbose_name='Nom du produit',
    )

    class Meta:
        ordering  = ['nom_produit']
        verbose_name        = 'Produit'
        verbose_name_plural = 'Produits'

    def __str__(self):
        return self.nom_produit


class Achat(models.Model):
    """
    Représente un achat effectué.
    Un achat concerne exactement un produit (1,1).
    Un produit peut être associé à plusieurs achats (0,n).
    """

    produit = models.ForeignKey(
        Produit,
        on_delete=models.CASCADE,
        related_name='achats',
        verbose_name='Produit',
    )
    prix = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name='Prix',
    )
    date_achat = models.DateField(
        verbose_name='Date de l\'achat',
    )

    class Meta:
        ordering        = ['-date_achat']          # du plus récent au plus ancien
        verbose_name        = 'Achat'
        verbose_name_plural = 'Achats'

    def __str__(self):
        return f'{self.produit.nom_produit} — {self.prix} FCFA le {self.date_achat}'

    # ── Méthode calculerTotal (diagramme de classes UML) ──
    @staticmethod
    def calculer_total(queryset=None):
        """Retourne la somme des prix d'un queryset d'achats (ou de tous)."""
        qs = queryset if queryset is not None else Achat.objects.all()
        result = qs.aggregate(total=models.Sum('prix'))
        return result['total'] or 0
