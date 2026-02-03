"""
purchase_project – URL configuration
"""

from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # REST API
    path('api/', include('purchases_app.urls')),

    # Servir le frontend SPA sur toutes les autres routes
    path('', TemplateView.as_view(template_name='index.html'), name='home'),
]

# En développement : servir les fichiers statiques
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
