using UnityEngine.UIElements;

namespace BitpurrDigital
{
    #if UNITY_6000_0_OR_NEWER
    [UxmlElement]
    public partial class TextArea : TextElement
    {
    }
    #else
    public class TextArea : TextField
    {
        public new class UxmlFactory : UxmlFactory<TextArea, UxmlTraits> { }
    
        public new class UxmlTraits : TextField.UxmlTraits { }
        
        public TextArea()
        {
        }
    }
    #endif
}