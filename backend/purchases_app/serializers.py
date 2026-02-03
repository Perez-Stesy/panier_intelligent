"""
purchases_app.serializers
"""

from rest_framework import serializers
from .models import Produit, Achat


class ProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Produit
        fields = ['id', 'nom_produit']


class AchatSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la lecture : inclut le nom du produit.
    """
    produit_nom = serializers.CharField(
        source='produit.nom_produit',
        read_only=True,
    )

    class Meta:
        model  = Achat
        fields = ['id', 'produit', 'produit_nom', 'prix', 'date_achat']
        read_only_fields = ['produit_nom']

    # ── Validation prix > 0 ──
    def validate_prix(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le prix doit être strictement positif.')
        return value


class AchatCreateSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour la création : accepte nom_produit (texte)
    et crée automatiquement le Produit s'il n'existe pas.
    """
    nom_produit = serializers.CharField(write_only=True, max_length=200)

    class Meta:
        model  = Achat
        fields = ['id', 'nom_produit', 'prix', 'date_achat']

    def validate_prix(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le prix doit être strictement positif.')
        return value

    def validate_nom_produit(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Le nom du produit est obligatoire.')
        return value.strip()

    def create(self, validated_data):
        nom = validated_data.pop('nom_produit')
        produit, _ = Produit.objects.get_or_create(nom_produit=nom)
        return Achat.objects.create(produit=produit, **validated_data)

    def to_representation(self, instance):
        """Retourne la représentation complète après création."""
        return AchatSerializer(instance).data
