"""
purchases_app.views

ViewSets REST :
  - ProduitViewSet   → CRUD produits
  - AchatViewSet     → CRUD achats + actions @top_produit / @bilan
"""

from django.db.models import Count, Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Produit, Achat
from .serializers import (
    ProduitSerializer,
    AchatSerializer,
    AchatCreateSerializer,
)


# ─── PRODUIT ───────────────────────────────────────
class ProduitViewSet(viewsets.ModelViewSet):
    """CRUD pour les produits."""
    queryset        = Produit.objects.all()
    serializer_class = ProduitSerializer


# ─── ACHAT ─────────────────────────────────────────
class AchatViewSet(viewsets.ModelViewSet):
    """
    CRUD achats avec deux actions personnalisées :
      POST /api/achats/            → créer un achat (avec auto-création produit)
      GET  /api/achats/            → liste (du plus récent au plus ancien)
      GET  /api/achats/top_produit/?start=YYYY-MM-DD&end=YYYY-MM-DD
      GET  /api/achats/bilan/     ?start=YYYY-MM-DD&end=YYYY-MM-DD
    """
    queryset = Achat.objects.select_related('produit').order_by('-date_achat')

    def get_serializer_class(self):
        if self.action in ('create',):
            return AchatCreateSerializer
        return AchatSerializer

    # ── Top Produit ────────────────────────────────
    @action(detail=False, methods=['get'], url_path='top_produit', url_name='top-produit')
    def top_produit(self, request):
        """
        Retourne le produit le plus acheté (par nombre d'occurrences)
        sur la période [start, end].
        Gère l'égalité entre plusieurs produits.
        """
        start = request.query_params.get('start')
        end   = request.query_params.get('end')

        qs = Achat.objects.select_related('produit')
        if start:
            qs = qs.filter(date_achat__gte=start)
        if end:
            qs = qs.filter(date_achat__lte=end)

        if not qs.exists():
            return Response(
                {'message': 'Aucun achat trouvé sur cette période.'},
                status=status.HTTP_200_OK,
            )

        # Agrégation par produit → nombre d'achats
        stats = (
            qs.values('produit__nom_produit')
              .annotate(nombre=Count('id'))
              .order_by('-nombre')
        )

        max_nombre = stats[0]['nombre']
        tops       = [s for s in stats if s['nombre'] == max_nombre]

        # Construire le classement complet (top 5)
        ranking = [
            {'produit': s['produit__nom_produit'], 'nombre': s['nombre']}
            for s in stats[:5]
        ]

        if len(tops) > 1:
            # Égalité
            return Response({
                'egalite': True,
                'produits': [t['produit__nom_produit'] for t in tops],
                'nombre':   max_nombre,
                'ranking':  ranking,
            })

        return Response({
            'egalite':  False,
            'produit':  tops[0]['produit__nom_produit'],
            'nombre':   max_nombre,
            'ranking':  ranking,
        })

    # ── Bilan Financier ────────────────────────────
    @action(detail=False, methods=['get'], url_path='bilan', url_name='bilan')
    def bilan(self, request):
        """
        Retourne le bilan financier sur une période donnée.
        Les calculs sont dynamiques (pas de stockage).
        """
        start = request.query_params.get('start')
        end   = request.query_params.get('end')

        qs = Achat.objects.all()
        if start:
            qs = qs.filter(date_achat__gte=start)
        if end:
            qs = qs.filter(date_achat__lte=end)

        nombre = qs.count()
        total  = Achat.calculer_total(qs)   # méthode du modèle

        if nombre == 0:
            return Response({
                'total':    '0.00',
                'nombre':   0,
                'moyenne':  '0.00',
                'max_prix': '0.00',
                'min_prix': '0.00',
            })

        from django.db.models import Max, Min
        agg = qs.aggregate(
            max_prix=Max('prix'),
            min_prix=Min('prix'),
        )

        return Response({
            'total':    str(total),
            'nombre':   nombre,
            'moyenne':  str(round(total / nombre, 2)),
            'max_prix': str(agg['max_prix']),
            'min_prix': str(agg['min_prix']),
        })
