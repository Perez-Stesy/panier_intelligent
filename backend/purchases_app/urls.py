"""
purchases_app.urls  –  Routes API REST
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'produits', views.ProduitViewSet)
router.register(r'achats',   views.AchatViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
