from .mock_gateway import MockGatewayAdapter

class StripeAdapter(MockGatewayAdapter):
    def __init__(self):
        super().__init__(
            gateway_id="B",
            name="Gateway B (Stripe-sim)",
            processor="Processor: Stripe-sim",
            baseline_latency=182,
            baseline_success_rate=98.7
        )
