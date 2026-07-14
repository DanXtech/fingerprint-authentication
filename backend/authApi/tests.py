from django.test import SimpleTestCase


class HealthCheckEndpointTests(SimpleTestCase):
    def test_health_endpoint_is_available_at_root(self):
        response = self.client.get("/health/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "message": "Server is running"})
