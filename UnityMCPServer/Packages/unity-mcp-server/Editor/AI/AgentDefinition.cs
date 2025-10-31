using System.Collections.Generic;

namespace UnityMCPServer.AI
{
    public sealed class AgentDefinition
    {
        public string Id { get; }
        public string Provider { get; }
        public string Model { get; }
        public string Endpoint { get; }
        public IReadOnlyList<string> Capabilities { get; }
        public bool IsDefault { get; }
        public string AuthRef { get; }
        public IReadOnlyDictionary<string, object> Metadata { get; }

        public AgentDefinition(
            string id,
            string provider,
            string model,
            string endpoint,
            IReadOnlyList<string> capabilities,
            bool isDefault,
            string authRef,
            IReadOnlyDictionary<string, object> metadata)
        {
            Id = id;
            Provider = provider;
            Model = model;
            Endpoint = endpoint;
            Capabilities = capabilities;
            IsDefault = isDefault;
            AuthRef = authRef;
            Metadata = metadata;
        }
    }
}
