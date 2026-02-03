"""
purchases_app.admin
"""

from django.contrib import admin
from .models import Produit, Achat


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display  = ['nom_produit']
    search_fields = ['nom_produit']


class AchatInline(admin.TabularInline):
    model = Achat
    extra = 1


@admin.register(Achat)
class AchatAdmin(admin.ModelAdmin):
    list_display  = ['produit', 'prix', 'date_achat']
    list_filter   = ['date_achat', 'produit']
    search_fields = ['produit__nom_produit']
    ordering      = ['-date_achat']
